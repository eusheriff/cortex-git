import { WorkflowEntrypoint, type WorkflowStep } from "cloudflare:workers";
import { CortexArbiter } from "./arbiter.js";
import { controlAuthorized } from "./auth.js";
import { readCommitEvidence } from "./artifact-evidence.js";
import { CortexCrypto } from "./crypto.js";
import { validateArtifactsPushEvent } from "./event-validation.js";
import { ApiError } from "./http-error.js";
import { expireApprovals, processPushEvent, recordApprovalVote } from "./governance.js";
import { RevocationRegistry } from "./revocation.js";
import { parseOrCreateTraceContext, attachTraceHeaders, type W3CTraceContext } from "./telemetry.js";
import type { ArtifactsPushEvent, TaskIntent } from "./types.js";

const json = (body: unknown, status = 200, trace?: W3CTraceContext) => {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  if (trace) attachTraceHeaders(headers, trace);
  return new Response(JSON.stringify(body), { status, headers });
};

async function bodyJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "Expected a JSON object");
  return body as Record<string, unknown>;
}

function taskString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) throw new ApiError(400, `Missing ${field}`);
  return value.trim();
}

async function createTask(request: Request, env: Env): Promise<Response> {
  if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await bodyJson(request);
  const taskId = taskString(body, "taskId");
  const sourceRepo = taskString(body, "sourceRepo");
  const baseCommitSha = taskString(body, "baseCommitSha");
  const description = taskString(body, "description");
  const rawAgents = body.agents;
  if (!Array.isArray(rawAgents) || rawAgents.length < 1 || rawAgents.length > 8) throw new ApiError(400, "agents must contain 1..8 agent definitions");
  const agents = rawAgents.map((item) => {
    if (!item || typeof item !== "object") throw new ApiError(400, "Invalid agent definition");
    const agent = item as Record<string, unknown>;
    for (const field of ["agentId", "name", "model", "publicKey"] as const) {
      if (typeof agent[field] !== "string" || !agent[field]) throw new ApiError(400, `Agent ${field} is required`);
    }
    if (!/^[0-9a-f]{64}$/i.test(agent.publicKey as string)) throw new ApiError(400, "Agent publicKey must be an Ed25519 public key hex string");
    return { agentId: agent.agentId as string, name: agent.name as string, model: agent.model as string,
      publicKey: (agent.publicKey as string).toLowerCase(), targetFiles: Array.isArray(agent.targetFiles) ? agent.targetFiles.filter((v): v is string => typeof v === "string") : [] };
  });
  if (new Set(agents.map((agent) => agent.agentId)).size !== agents.length) throw new ApiError(400, "Agent identities must be unique");

  const source = await env.ARTIFACTS.get(sourceRepo);
  const baseEvidence = await readCommitEvidence(source, baseCommitSha);
  if (!baseEvidence.commit.hash || baseEvidence.commit.hash !== baseCommitSha) throw new ApiError(400, "Base commit SHA did not match Artifacts metadata");
  const createdAt = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO tasks (account_id, namespace, task_id, source_repo, base_commit_sha, description, expected_agents, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`)
    .bind(env.CLOUDFLARE_ACCOUNT_ID, "cortex-git", taskId, sourceRepo, baseCommitSha, description, agents.length, createdAt).run();

  const workspaces: Array<{ agentId: string; repository: string; remote: string; token: string; tokenExpiresAt: string }> = [];
  try {
    for (const agent of agents) {
      await env.DB.prepare(`INSERT INTO agents (account_id, agent_id, name, model, public_key, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(env.CLOUDFLARE_ACCOUNT_ID, agent.agentId, agent.name, agent.model, agent.publicKey, createdAt).run();
      const intent: TaskIntent = { taskId, agentId: agent.agentId, repo: sourceRepo, description,
        targetFiles: agent.targetFiles, expectedModifications: [], safetyConstraints: [], timestamp: Date.now() };
      const triage = await new CortexArbiter(env.ARTIFACTS).triageIntent(intent);
      const scopedToken = triage.workspace;
      const tokenHash = await CortexCrypto.sha256(scopedToken.token);
      await env.DB.prepare(`INSERT INTO workspaces (account_id, namespace, repository, agent_id, task_id, remote,
        token_id, token_hash, token_expires_at, base_commit_sha, role, created_at)
        VALUES (?, 'cortex-git', ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?)`)
        .bind(env.CLOUDFLARE_ACCOUNT_ID, triage.workspace.name, agent.agentId, taskId, triage.workspace.remote,
          scopedToken.tokenId, tokenHash, scopedToken.tokenExpiresAt, baseCommitSha, createdAt).run();
      workspaces.push({ agentId: agent.agentId, repository: triage.workspace.name, remote: triage.workspace.remote,
        token: scopedToken.token, tokenExpiresAt: scopedToken.tokenExpiresAt });
    }
  } catch (error) {
    for (const workspace of workspaces) await (await env.ARTIFACTS.get(workspace.repository)).revokeToken(workspace.token).catch(() => false);
    await env.DB.prepare("UPDATE tasks SET status = 'SETUP_FAILED' WHERE account_id = ? AND namespace = ? AND task_id = ?")
      .bind(env.CLOUDFLARE_ACCOUNT_ID, "cortex-git", taskId).run();
    throw error;
  }
  return json({ taskId, baseCommitSha, workspaces }, 201);
}

async function captureAttestation(request: Request, env: Env): Promise<Response> {
  if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await bodyJson(request);
  const repository = taskString(body, "repository");
  const ref = taskString(body, "ref");
  const commitSha = taskString(body, "commitSha");
  const agentId = taskString(body, "agentId");
  const signatureHex = taskString(body, "signatureHex");
  const workspace = await env.DB.prepare(`SELECT agent_id FROM workspaces WHERE account_id = ? AND namespace = ? AND repository = ?`)
    .bind(env.CLOUDFLARE_ACCOUNT_ID, "cortex-git", repository).first<{ agent_id: string }>();
  if (!workspace || workspace.agent_id !== agentId) return json({ error: "Agent is not bound to this workspace" }, 403);
  const agent = await env.DB.prepare("SELECT public_key FROM agents WHERE account_id = ? AND agent_id = ?")
    .bind(env.CLOUDFLARE_ACCOUNT_ID, agentId).first<{ public_key: string }>();
  const signedPayload = CortexCrypto.agentAttestationPayload(repository, ref, commitSha, agentId);
  if (!agent || !await CortexCrypto.verifySignature(signedPayload, signatureHex, agent.public_key)) return json({ error: "Invalid agent attestation" }, 403);
  await env.DB.prepare(`INSERT OR IGNORE INTO attestations (account_id, namespace, repository, ref, commit_sha, agent_id, signature_hex, created_at)
    VALUES (?, 'cortex-git', ?, ?, ?, ?, ?, ?)`)
    .bind(env.CLOUDFLARE_ACCOUNT_ID, repository, ref, commitSha, agentId, signatureHex, new Date().toISOString()).run();
  return json({ accepted: true, repository, ref, commitSha, agentId }, 201);
}

async function createApprover(request: Request, env: Env): Promise<Response> {
  if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await bodyJson(request);
  const approverId = taskString(body, "approverId");
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  await env.DB.prepare("INSERT INTO approvers (account_id, approver_id, token_hash, created_at) VALUES (?, ?, ?, ?)")
    .bind(env.CLOUDFLARE_ACCOUNT_ID, approverId, await CortexCrypto.sha256(token), new Date().toISOString()).run();
  return json({ approverId, token }, 201);
}

async function handleRequest(request: Request, env: Env, trace: W3CTraceContext): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/status") {
    return json({ service: "cortex-git-governance", eventType: "cf.artifacts.repo.pushed", traceId: trace.traceId }, 200, trace);
  }
  if (request.method === "POST" && url.pathname === "/api/governance/killswitch") {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401, trace);
    if (!env.CORTEX_KV) return json({ error: "KV binding not configured" }, 503, trace);
    const body = await bodyJson(request);
    const active = Boolean(body.active);
    const registry = new RevocationRegistry(env.CORTEX_KV);
    if (typeof body.repo === "string" && body.repo.trim()) {
      await registry.setRepoKillSwitch(body.repo.trim(), active, typeof body.reason === "string" ? body.reason : undefined);
      return json({ success: true, target: "repo", repo: body.repo.trim(), active }, 200, trace);
    }
    await registry.setGlobalKillSwitch(active, typeof body.reason === "string" ? body.reason : undefined);
    return json({ success: true, target: "global", active }, 200, trace);
  }
  if (request.method === "POST" && url.pathname === "/api/governance/revoke-agent") {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401, trace);
    if (!env.CORTEX_KV) return json({ error: "KV binding not configured" }, 503, trace);
    const body = await bodyJson(request);
    const publicKey = taskString(body, "publicKey");
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const registry = new RevocationRegistry(env.CORTEX_KV);
    await registry.revokeAgent(publicKey, reason);
    return json({ success: true, revokedPublicKey: publicKey.toLowerCase() }, 200, trace);
  }
  if (request.method === "GET" && url.pathname === "/api/governance/revocation-status") {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401, trace);
    if (!env.CORTEX_KV) return json({ error: "KV binding not configured" }, 503, trace);
    const registry = new RevocationRegistry(env.CORTEX_KV);
    const key = url.searchParams.get("key") ?? undefined;
    const repo = url.searchParams.get("repo") ?? undefined;
    const status = await registry.checkRevocation(key, repo);
    return json({ revoked: Boolean(status?.revoked), details: status }, 200, trace);
  }
  if (request.method === "POST" && url.pathname === "/api/repos") {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
    const body = await bodyJson(request);
    const name = taskString(body, "name");
    const created = await env.ARTIFACTS.create(name, { setDefaultBranch: "main", description: "CORTEX governance E2E source" });
    return json({ name: created.name, remote: created.remote, token: created.token }, 201);
  }
  if (request.method === "POST" && url.pathname === "/api/tasks") return createTask(request, env);
  if (request.method === "POST" && url.pathname === "/api/attestations") return captureAttestation(request, env);
  if (request.method === "POST" && url.pathname === "/api/approvers") return createApprover(request, env);
  const vote = url.pathname.match(/^\/api\/approvals\/([^/]+)\/votes$/);
  if (request.method === "POST" && vote) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const body = await bodyJson(request);
    if (body.decision !== "APPROVED" && body.decision !== "REJECTED") throw new ApiError(400, "decision must be APPROVED or REJECTED");
    return json(await recordApprovalVote(env, decodeURIComponent(vote[1]), token, body.decision));
  }
  const replay = url.pathname.match(/^\/api\/governance\/([^/]+)\/replay$/);
  if (request.method === "POST" && replay) {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
    const commitSha = decodeURIComponent(replay[1]);
    const event = await env.DB.prepare(`SELECT payload_json FROM governance_events WHERE account_id = ? AND commit_sha = ? ORDER BY received_at LIMIT 1`)
      .bind(env.CLOUDFLARE_ACCOUNT_ID, commitSha).first<{ payload_json: string }>();
    if (!event) return json({ error: "No captured Cloudflare event for this commit" }, 404);
    return json(await processPushEvent(env, JSON.parse(event.payload_json) as ArtifactsPushEvent));
  }
  const governance = url.pathname.match(/^\/api\/governance\/([^/]+)$/);
  if (request.method === "GET" && governance) {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
    const sha = decodeURIComponent(governance[1]);
    const rows = await env.DB.prepare(`SELECT e.account_id, e.namespace, e.repository, e.ref, e.commit_sha, e.status AS event_status,
      d.decision, d.outcome_json, p.state AS promotion_state, p.updated_at AS promotion_updated_at,
      a.approval_id, a.status AS approval_status, a.required_approvals, a.received_approvals, a.expires_at AS approval_expires_at
      FROM governance_events e LEFT JOIN decisions d ON d.event_key = e.event_key
      LEFT JOIN promotions p ON p.event_key = e.event_key LEFT JOIN approvals a ON a.event_key = e.event_key
      WHERE e.account_id = ? AND e.commit_sha = ? ORDER BY e.received_at`)
      .bind(env.CLOUDFLARE_ACCOUNT_ID, sha).all();
    return json(rows.results ?? []);
  }
  const task = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (request.method === "GET" && task) {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
    const taskId = decodeURIComponent(task[1]);
    const taskRow = await env.DB.prepare("SELECT * FROM tasks WHERE account_id = ? AND namespace = ? AND task_id = ?")
      .bind(env.CLOUDFLARE_ACCOUNT_ID, "cortex-git", taskId).first();
    const conflicts = await env.DB.prepare("SELECT * FROM conflicts WHERE account_id = ? AND namespace = ? AND task_id = ?")
      .bind(env.CLOUDFLARE_ACCOUNT_ID, "cortex-git", taskId).all();
    return json({ task: taskRow, conflicts: conflicts.results ?? [] });
  }
  const approval = url.pathname.match(/^\/api\/approvals\/([^/]+)$/);
  if (request.method === "GET" && approval) {
    if (!await controlAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
    const row = await env.DB.prepare(`SELECT a.*, e.account_id, e.namespace, e.repository, e.ref, e.commit_sha FROM approvals a
      JOIN governance_events e ON e.event_key = a.event_key WHERE a.approval_id = ?`)
      .bind(decodeURIComponent(approval[1])).first();
    return row ? json(row) : json({ error: "Approval not found" }, 404);
  }
  return json({ error: "Not found" }, 404);
}

export class GovernanceWorkflow extends WorkflowEntrypoint<Env, ArtifactsPushEvent> {
  override async run(event: Readonly<{ payload: ArtifactsPushEvent }>, step: WorkflowStep): Promise<unknown> {
    const validation = validateArtifactsPushEvent(event.payload, this.env.CLOUDFLARE_ACCOUNT_ID);
    if (!validation.valid) {
      const received = event.payload as unknown;
      const record = received && typeof received === "object" ? received as Record<string, unknown> : undefined;
      const source = record?.source && typeof record.source === "object" ? record.source as Record<string, unknown> : undefined;
      const payload = record?.payload && typeof record.payload === "object" ? record.payload as Record<string, unknown> : undefined;
      console.error(JSON.stringify({ event: "artifacts_push_rejected", code: validation.code,
        keys: record ? Object.keys(record).sort() : [], type: record?.type,
        sourceType: source?.type, payloadKeys: payload ? Object.keys(payload).sort() : [],
        refType: typeof payload?.ref, afterType: typeof payload?.after,
        afterLength: typeof payload?.after === "string" ? payload.after.length : undefined }));
      return { status: "REJECTED", reason: validation.code };
    }
    return step.do("capture-and-govern-authoritative-artifacts-commit", async () =>
      JSON.stringify(await processPushEvent(this.env, validation.event)));
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const trace = parseOrCreateTraceContext(request);
    return handleRequest(request, env, trace).catch((error: unknown) => {
      if (error instanceof ApiError) return json({ error: error.message }, error.status, trace);
      console.error(JSON.stringify({ event: "request_failed", path: new URL(request.url).pathname,
        traceId: trace.traceId, errorName: error instanceof Error ? error.name : "UnknownError" }));
      return json({ error: "Internal server error" }, 500, trace);
    });
  },
  scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    return expireApprovals(env).then(() => undefined);
  },
};
