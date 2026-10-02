import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { CortexCrypto } from "../src/crypto.js";

const baseUrl = process.env.CORTEX_WORKER_URL ?? "https://cortex-git.xerifegomes-e71.workers.dev";
const controlKey = process.env.CORTEX_CONTROL_KEY;
if (!controlKey) throw new Error("Set CORTEX_CONTROL_KEY to a Worker secret before running the real E2E");
const root = mkdtempSync(path.join(tmpdir(), "cortex-git-live-"));
const authEnv = (token: string) => ({ ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: `Authorization: Bearer ${token}` });
const git = (cwd: string, args: string[], token?: string) => execFileSync("git", args, {
  cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: token ? authEnv(token) : process.env,
}).trim();
async function api(route: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<any> {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? "GET",
    headers: { ...(options.body ? { "content-type": "application/json" } : {}),
      authorization: `Bearer ${options.token ?? controlKey}` },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${route} returned ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor<T>(description: string, read: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (ready(value)) return value;
    await pause(2_000);
  }
  throw new Error(`Timed out waiting for ${description}`);
}
async function newAgent(id: string) {
  const keys = await CortexCrypto.generateAgentKeypair();
  return { id, keys, definition: { agentId: id, name: id, model: "e2e-agent", publicKey: keys.publicKeyHex } };
}
type Agent = Awaited<ReturnType<typeof newAgent>>;
async function beginTask(taskId: string, sourceRepo: string, baseCommitSha: string, description: string, agents: Agent[]) {
  return api("/api/tasks", { method: "POST", token: controlKey, body: {
    taskId, sourceRepo, baseCommitSha, description, agents: agents.map((agent) => agent.definition),
  } });
}
async function commitAndPush(workspace: any, agent: Agent, file: string, content: string, message: string) {
  const directory = path.join(root, `clone-${workspace.repository}-${crypto.randomUUID().slice(0, 8)}`);
  git(root, ["clone", workspace.remote, directory], workspace.token);
  git(directory, ["config", "user.name", agent.id]);
  git(directory, ["config", "user.email", `${agent.id}@metadata.invalid`]);
  const target = path.join(directory, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  git(directory, ["add", file]);
  git(directory, ["commit", "-m", message]);
  const commitSha = git(directory, ["rev-parse", "HEAD"]);
  const ref = git(directory, ["symbolic-ref", "HEAD"]);
  const signatureHex = await CortexCrypto.signPayload(workspace.repository + ":" + commitSha + ":" + agent.id, agent.keys.privateKey);
  await api("/api/attestations", { method: "POST", token: controlKey, body: {
    repository: workspace.repository, ref, commitSha, agentId: agent.id, signatureHex,
  } });
  git(directory, ["push", "origin", "HEAD"], workspace.token);
  return { commitSha, ref, directory };
}
async function governance(sha: string) {
  return api(`/api/governance/${sha}`) as Promise<any[]>;
}
async function waitDecision(sha: string, decision: string) {
  return waitFor(`commit ${sha} decision ${decision} and promotion`, () => governance(sha),
    (rows) => rows.some((r) => r.decision === decision && r.promotion_state && r.promotion_state !== "PENDING"));
}

async function main() {
  const unique = `cortex-e2e-${crypto.randomUUID().slice(0, 8)}`;
  const created = await api("/api/repos", { method: "POST", token: controlKey, body: { name: unique } });
  const sourceDir = path.join(root, "source");
  mkdirSync(sourceDir);
  git(sourceDir, ["init", "-b", "main"]);
  git(sourceDir, ["config", "user.name", "E2E baseline"]);
  git(sourceDir, ["config", "user.email", "baseline@metadata.invalid"]);
  mkdirSync(path.join(sourceDir, "src"));
  writeFileSync(path.join(sourceDir, "src", "shared.txt"), "mode=base\nstatus=stable\n");
  writeFileSync(path.join(sourceDir, "README.md"), "Artifacts-backed governance fixture\n");
  git(sourceDir, ["add", "."]);
  git(sourceDir, ["commit", "-m", "seed governance base"]);
  const baseCommitSha = git(sourceDir, ["rev-parse", "HEAD"]);
  git(sourceDir, ["push", created.remote, "main"], created.token);

  const baseline = await waitFor("seed commit event processing", () => governance(baseCommitSha),
    (rows) => rows.some((row) => row.event_status === "IGNORED_UNASSOCIATED_REPO"));
  assert.equal(baseline[0].event_status, "IGNORED_UNASSOCIATED_REPO", "baseline is real but not an agent workspace");

  const safeAgent = await newAgent(`${unique}-safe`);
  const safeTask = await beginTask(`${unique}-safe`, unique, baseCommitSha, "Implement a small safe source change", [safeAgent]);
  const safeWs = safeTask.workspaces.find((workspace: any) => workspace.agentId === safeAgent.id);
  const safe = await commitAndPush(safeWs, safeAgent, "src/safe.ts", "export const safe = true;\n", "safe change");
  const safeRows = await waitDecision(safe.commitSha, "ALLOW");
  assert.equal(safeRows[0].promotion_state, "AUTHORIZED");
  const replay = await api(`/api/governance/${safe.commitSha}/replay`, { method: "POST", token: controlKey });
  assert.equal(replay.duplicate, true);
  const replayRows = await governance(safe.commitSha);
  assert.equal(replayRows.length, 1, "replaying the captured event must not duplicate decisions");

  const secretAgent = await newAgent(`${unique}-secret`);
  const secretTask = await beginTask(`${unique}-secret`, unique, baseCommitSha, "Add telemetry", [secretAgent]);
  const secretWs = secretTask.workspaces.find((workspace: any) => workspace.agentId === secretAgent.id);
  const denied = await commitAndPush(secretWs, secretAgent, "src/config.ts", `const api_key = "ghp_${"A".repeat(36)}";\n`, "unsafe synthetic secret");
  const deniedRows = await waitDecision(denied.commitSha, "DENY");
  assert.equal(deniedRows[0].promotion_state, "BLOCKED");

  const sensitiveAgent = await newAgent(`${unique}-sensitive`);
  const sensitiveTask = await beginTask(`${unique}-sensitive`, unique, baseCommitSha, "Change schema", [sensitiveAgent]);
  const sensitiveWs = sensitiveTask.workspaces.find((workspace: any) => workspace.agentId === sensitiveAgent.id);
  const sensitive = await commitAndPush(sensitiveWs, sensitiveAgent, "migrations/001_sensitive.sql", "CREATE TABLE review_queue (id TEXT PRIMARY KEY);\n", "sensitive schema change");
  const escalated = await waitDecision(sensitive.commitSha, "ESCALATE");
  const approvalId = escalated[0].approval_id;
  assert.equal(escalated[0].promotion_state, "FROZEN");
  assert.ok(approvalId);
  const reviewerA = await api("/api/approvers", { method: "POST", token: controlKey, body: { approverId: `${unique}-reviewer-a` } });
  const reviewerB = await api("/api/approvers", { method: "POST", token: controlKey, body: { approverId: `${unique}-reviewer-b` } });
  await api(`/api/approvals/${approvalId}/votes`, { method: "POST", token: reviewerA.token, body: { decision: "APPROVED" } });
  const approved = await api(`/api/approvals/${approvalId}/votes`, { method: "POST", token: reviewerB.token, body: { decision: "APPROVED" } });
  assert.equal(approved.status, "APPROVED");
  assert.equal((await governance(sensitive.commitSha))[0].promotion_state, "AUTHORIZED");

  const conflictAgents = [await newAgent(`${unique}-a`), await newAgent(`${unique}-b`)];
  const conflictTask = await beginTask(`${unique}-conflict`, unique, baseCommitSha, "Edit shared mode", conflictAgents);
  const workspaceA = conflictTask.workspaces.find((workspace: any) => workspace.agentId === conflictAgents[0].id);
  const workspaceB = conflictTask.workspaces.find((workspace: any) => workspace.agentId === conflictAgents[1].id);
  const commitA = await commitAndPush(workspaceA, conflictAgents[0], "src/shared.txt", "mode=agent-a\nstatus=stable\n", "agent A changes shared mode");
  const commitB = await commitAndPush(workspaceB, conflictAgents[1], "src/shared.txt", "mode=agent-b\nstatus=stable\n", "agent B changes shared mode");
  const conflictState = await waitFor("real Git conflict detection", () => api(`/api/tasks/${conflictTask.taskId}`),
    (value) => value.task?.status === "RESOLUTION_PENDING" && value.conflicts?.length > 0);
  assert.equal(conflictState.conflicts[0].status, "RESOLUTION_PENDING");
  assert.match(conflictState.conflicts[0].evidence_json, new RegExp(`${commitA.commitSha}|${commitB.commitSha}`));

  const resolution = await commitAndPush(workspaceA, conflictAgents[0], "src/shared.txt", "mode=resolved\nstatus=stable\n", "resolve shared mode conflict");
  const resolvedRows = await waitDecision(resolution.commitSha, "ALLOW");
  assert.equal(resolvedRows[0].promotion_state, "AUTHORIZED", "resolution commit must pass a new governance cycle");
  const afterResolution = await api(`/api/tasks/${conflictTask.taskId}`);
  assert.equal(afterResolution.task.status, "RESOLVED");

  console.log(JSON.stringify({
    result: "REAL_CLOUDFLARE_E2E_PASS",
    sourceRepository: unique,
    baseCommitSha,
    safe: { commitSha: safe.commitSha, decision: "ALLOW", promotion: "AUTHORIZED" },
    secret: { commitSha: denied.commitSha, decision: "DENY", promotion: "BLOCKED" },
    sensitive: { commitSha: sensitive.commitSha, decision: "ESCALATE", approvalId, approval: "APPROVED", promotion: "AUTHORIZED" },
    duplicateEvent: { commitSha: safe.commitSha, decisionRows: replayRows.length, idempotent: replay.duplicate },
    conflict: { taskId: conflictTask.taskId, candidates: [commitA.commitSha, commitB.commitSha], state: "RESOLUTION_PENDING", resolutionCommit: resolution.commitSha, finalPromotion: "AUTHORIZED" },
  }, null, 2));
}

main().catch((error) => {
  console.error("Real Cloudflare E2E failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => rmSync(root, { recursive: true, force: true }));
