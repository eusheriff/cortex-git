import { CortexCrypto } from "./crypto.js";
import { detectLineConflicts, LineConflict } from "./conflicts.js";
import { CortexGatekeeper } from "./gatekeeper.js";
import { RevocationRegistry } from "./revocation.js";
import { ArtifactsPushEvent, AgentIdentity, TaskIntent } from "./types.js";
import { canonicalJson, eventIdentity, readCommitEvidence } from "./artifact-evidence.js";

const APPROVAL_TTL_MS = 24 * 60 * 60 * 1_000;
const PROCESSING_LEASE_MS = 2 * 60 * 1_000;

interface WorkspaceRow {
  account_id: string;
  namespace: string;
  repository: string;
  agent_id: string;
  task_id: string;
  base_commit_sha: string;
  remote: string;
  role: string;
}

interface TaskRow {
  account_id: string;
  namespace: string;
  task_id: string;
  source_repo: string;
  base_commit_sha: string;
  description: string;
  expected_agents: number;
  status: string;
  resolution_conflict_id: string | null;
}

interface CandidateRow {
  event_key: string;
  repository: string;
  ref: string;
  commit_sha: string;
  agent_id: string;
  parent_sha: string;
  decision: "ALLOW" | "DENY" | "ESCALATE";
}

interface AgentRow {
  agent_id: string;
  name: string;
  model: string;
  public_key: string;
  created_at: string;
}

const nowIso = (): string => new Date().toISOString();

function eventKey(event: ArtifactsPushEvent, accountId: string): string {
  return eventIdentity({
    accountId,
    namespace: event.source.namespace,
    repository: event.source.repoName,
    ref: event.payload.ref,
    commitSha: event.payload.after,
  });
}

async function recordPromotionTransition(
  db: D1Database,
  key: string,
  next: "PENDING" | "AUTHORIZED" | "BLOCKED" | "FROZEN" | "CONFLICT" | "RESOLVED",
  reason: string,
): Promise<void> {
  const current = await db.prepare("SELECT state FROM promotions WHERE event_key = ?")
    .bind(key).first<{ state: string }>();
  if (!current) {
    await db.prepare("INSERT INTO promotions (event_key, state, updated_at) VALUES (?, 'PENDING', ?)")
      .bind(key, nowIso()).run();
    await db.prepare(`INSERT INTO promotion_transitions
      (transition_id, event_key, from_state, to_state, reason, created_at)
      VALUES (?, ?, NULL, 'PENDING', ?, ?)`)
      .bind(crypto.randomUUID(), key, "Governance evaluation started", nowIso()).run();
    if (next === "PENDING") return;
    return recordPromotionTransition(db, key, next, reason);
  }
  if (current.state === next) return;

  const allowed: Record<string, string[]> = {
    PENDING: ["AUTHORIZED", "BLOCKED", "FROZEN", "CONFLICT"],
    FROZEN: ["AUTHORIZED", "BLOCKED"],
    CONFLICT: ["RESOLVED"],
  };
  if (!allowed[current.state]?.includes(next)) {
    throw new Error(`Invalid promotion transition ${current.state} -> ${next}`);
  }
  const updated = await db.prepare("UPDATE promotions SET state = ?, updated_at = ? WHERE event_key = ? AND state = ?")
    .bind(next, nowIso(), key, current.state).run();
  if ((updated.meta.changes ?? 0) !== 1) return;
  await db.prepare(`INSERT INTO promotion_transitions
    (transition_id, event_key, from_state, to_state, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), key, current.state, next, reason, nowIso()).run();
}

async function recordConflictTransition(
  db: D1Database,
  conflictId: string,
  previous: string | null,
  next: "CONFLICT_DETECTED" | "RESOLUTION_PENDING" | "RESOLVED",
  reason: string,
): Promise<void> {
  await db.prepare(`INSERT INTO conflict_transitions
    (transition_id, conflict_id, from_state, to_state, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), conflictId, previous, next, reason, nowIso()).run();
}

async function persistEvent(db: D1Database, event: ArtifactsPushEvent, accountId: string): Promise<{
  key: string;
  process: boolean;
  status: string;
  existingDecision?: string;
}> {
  const key = eventKey(event, accountId);
  const payloadJson = canonicalJson(event);
  const payloadHash = await CortexCrypto.sha256(payloadJson);
  const existing = await db.prepare(`SELECT payload_hash, status, processing_started_at
    FROM governance_events WHERE event_key = ?`).bind(key).first<{
      payload_hash: string; status: string; processing_started_at: string | null;
    }>();

  if (existing && existing.payload_hash !== payloadHash) {
    const anomaly = JSON.stringify({ type: "CONFLICTING_DUPLICATE", receivedPayloadHash: payloadHash, detectedAt: nowIso() });
    await db.prepare(`UPDATE governance_events SET status = 'ANOMALY', anomaly_json = ?
      WHERE event_key = ? AND status NOT IN ('DECIDED', 'IGNORED_UNASSOCIATED_REPO')`)
      .bind(anomaly, key).run();
    return { key, process: false, status: "ANOMALY" };
  }

  if (!existing) {
    await db.prepare(`INSERT OR IGNORE INTO governance_events
      (event_key, account_id, namespace, repository, ref, commit_sha, payload_json,
       payload_hash, status, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?)`)
      .bind(key, accountId, event.source.namespace, event.source.repoName,
        event.payload.ref, event.payload.after, payloadJson, payloadHash, nowIso()).run();
  }

  const latest = await db.prepare("SELECT status, processing_started_at FROM governance_events WHERE event_key = ?")
    .bind(key).first<{ status: string; processing_started_at: string | null }>();
  if (!latest) throw new Error("Governance event insert was not visible");
  if (["DECIDED", "IGNORED_UNASSOCIATED_REPO", "ANOMALY"].includes(latest.status)) {
    const decision = await db.prepare("SELECT decision FROM decisions WHERE event_key = ?")
      .bind(key).first<{ decision: string }>();
    return { key, process: false, status: latest.status, existingDecision: decision?.decision };
  }
  const leaseExpired = latest.status === "PROCESSING" && latest.processing_started_at !== null &&
    Date.now() - Date.parse(latest.processing_started_at) > PROCESSING_LEASE_MS;
  if (latest.status === "PROCESSING" && !leaseExpired) return { key, process: false, status: latest.status };

  const claimed = await db.prepare(`UPDATE governance_events
    SET status = 'PROCESSING', processing_started_at = ?
    WHERE event_key = ? AND (status IN ('RECEIVED', 'FAILED') OR
      (status = 'PROCESSING' AND processing_started_at < ?))`)
    .bind(nowIso(), key, new Date(Date.now() - PROCESSING_LEASE_MS).toISOString()).run();
  return { key, process: (claimed.meta.changes ?? 0) === 1, status: "PROCESSING" };
}

async function createApproval(
  db: D1Database,
  key: string,
  event: ArtifactsPushEvent,
  required: number,
  accountId: string,
): Promise<void> {
  const approvalId = `approval-${crypto.randomUUID()}`;
  await db.prepare(`INSERT OR IGNORE INTO approvals
    (approval_id, event_key, account_id, namespace, repository, ref, commit_sha,
     requested_at, expires_at, required_approvals, received_approvals, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING_HUMAN_APPROVAL')`)
    .bind(approvalId, key, accountId, event.source.namespace, event.source.repoName,
      event.payload.ref, event.payload.after, nowIso(), new Date(Date.now() + APPROVAL_TTL_MS).toISOString(), required).run();
}

async function checkTaskConflicts(
  env: Env,
  task: TaskRow,
): Promise<{ conflictId: string; candidates: CandidateRow[] } | null> {
  const candidatesResult = await env.DB.prepare(`SELECT c.event_key, e.repository, e.ref, e.commit_sha,
      c.agent_id, c.parent_sha, d.decision
    FROM commits c JOIN governance_events e ON e.event_key = c.event_key
    JOIN decisions d ON d.event_key = c.event_key
    WHERE c.task_id = ? AND c.evaluation_status = 'EVALUATED'
    ORDER BY c.retrieved_at ASC`).bind(task.task_id).all<CandidateRow>();
  const byAgent = new Map<string, CandidateRow>();
  for (const candidate of candidatesResult.results ?? []) byAgent.set(candidate.agent_id, candidate);
  const candidates = [...byAgent.values()];
  if (candidates.length < task.expected_agents || candidates.length < 2) return null;

  const snapshots = [] as Array<{ row: CandidateRow; evidence: Awaited<ReturnType<typeof readCommitEvidence>> }>;
  for (const row of candidates) {
    const repo = await env.ARTIFACTS.get(row.repository);
    const evidence = await readCommitEvidence(repo, row.commit_sha);
    if (!evidence.commit.parents.includes(task.base_commit_sha)) return null;
    snapshots.push({ row, evidence });
  }
  const baseRepo = await env.ARTIFACTS.get(task.source_repo);
  const fileOverlap = snapshots[0].evidence.changedPaths.filter((path) =>
    snapshots.slice(1).some(({ evidence }) => evidence.changedPaths.includes(path))
  );
  const conflicts: LineConflict[] = [];
  for (const path of fileOverlap) {
    const baseBlob = await baseRepo.readFile({ ref: task.base_commit_sha, path });
    if (!baseBlob) continue;
    const baseText = await baseBlob.text();
    const textA = snapshots[0].evidence.changedFiles.get(path);
    const textB = snapshots[1].evidence.changedFiles.get(path);
    if (textA === undefined || textB === undefined) continue;
    conflicts.push(...detectLineConflicts(path, baseText, textA, textB));
  }
  if (!conflicts.length) return null;

  const existing = await env.DB.prepare("SELECT conflict_id FROM conflicts WHERE account_id = ? AND namespace = ? AND task_id = ?")
    .bind(task.account_id, task.namespace, task.task_id).first<{ conflict_id: string }>();
  if (existing) return { conflictId: existing.conflict_id, candidates };

  const conflictId = `conflict-${crypto.randomUUID()}`;
  const evidenceJson = canonicalJson({
    baseCommitSha: task.base_commit_sha,
    candidates: snapshots.map(({ row, evidence }) => ({
      repository: row.repository,
      commitSha: row.commit_sha,
      parentSha: evidence.commit.parents[0],
      changedPaths: evidence.changedPaths,
    })),
    lineConflicts: conflicts,
  });
  await env.DB.prepare(`INSERT INTO conflicts
    (conflict_id, account_id, namespace, task_id, base_commit_sha, candidate_a_sha,
     candidate_b_sha, evidence_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFLICT_DETECTED', ?)`)
    .bind(conflictId, task.account_id, task.namespace, task.task_id, task.base_commit_sha,
      snapshots[0].row.commit_sha, snapshots[1].row.commit_sha, evidenceJson, nowIso()).run();
  await recordConflictTransition(env.DB, conflictId, null, "CONFLICT_DETECTED", "Divergent edits overlap on the same base lines");
  await env.DB.prepare("UPDATE conflicts SET status = 'RESOLUTION_PENDING' WHERE conflict_id = ?")
    .bind(conflictId).run();
  await recordConflictTransition(env.DB, conflictId, "CONFLICT_DETECTED", "RESOLUTION_PENDING", "A new governed resolution commit is required");
  await env.DB.prepare("UPDATE tasks SET status = 'RESOLUTION_PENDING', resolution_conflict_id = ? WHERE account_id = ? AND namespace = ? AND task_id = ?")
    .bind(conflictId, task.account_id, task.namespace, task.task_id).run();
  for (const candidate of candidates) {
    await recordPromotionTransition(env.DB, candidate.event_key, "CONFLICT", "Conflicting Artifacts commits cannot be promoted");
  }
  return { conflictId, candidates };
}

async function completeResolutionIfPresent(
  env: Env,
  task: TaskRow,
  event: ArtifactsPushEvent,
  commit: ArtifactsCommitMetadata,
  key: string,
): Promise<boolean> {
  if (task.status !== "RESOLUTION_PENDING" || !task.resolution_conflict_id) return false;
  const conflict = await env.DB.prepare("SELECT * FROM conflicts WHERE conflict_id = ?")
    .bind(task.resolution_conflict_id).first<{
      conflict_id: string; candidate_a_sha: string; candidate_b_sha: string; status: string;
    }>();
  if (!conflict || conflict.status !== "RESOLUTION_PENDING") return false;
  if (commit.hash === conflict.candidate_a_sha || commit.hash === conflict.candidate_b_sha ||
      !commit.parents.some((parent) => parent === conflict.candidate_a_sha || parent === conflict.candidate_b_sha)) return false;

  await env.DB.prepare(`UPDATE conflicts SET status = 'RESOLVED', resolution_event_key = ?, resolved_at = ?
    WHERE conflict_id = ? AND status = 'RESOLUTION_PENDING'`)
    .bind(key, nowIso(), conflict.conflict_id).run();
  await recordConflictTransition(env.DB, conflict.conflict_id, "RESOLUTION_PENDING", "RESOLVED", "A new commit based on a conflicting candidate was retrieved from Artifacts");
  await env.DB.prepare("UPDATE tasks SET status = 'RESOLVED' WHERE account_id = ? AND namespace = ? AND task_id = ?")
    .bind(task.account_id, task.namespace, task.task_id).run();
  await env.DB.prepare(`UPDATE promotions SET state = 'RESOLVED', updated_at = ?
    WHERE event_key IN (SELECT event_key FROM commits WHERE task_id = ?) AND state = 'CONFLICT'`)
    .bind(nowIso(), task.task_id).run();
  await env.DB.prepare(`INSERT INTO promotion_transitions
    (transition_id, event_key, from_state, to_state, reason, created_at)
    SELECT lower(hex(randomblob(16))), event_key, 'CONFLICT', 'RESOLVED', ?, ?
      FROM commits WHERE task_id = ? AND event_key <> ?`)
    .bind("Conflict resolution commit received; candidate commit remains unpromoted", nowIso(), task.task_id, key).run();
  return true;
}

async function finalizeCandidatePromotions(env: Env, task: TaskRow): Promise<void> {
  const results = await env.DB.prepare(`SELECT c.event_key, d.decision FROM commits c
    JOIN decisions d ON d.event_key = c.event_key
    WHERE c.task_id = ? AND c.evaluation_status = 'EVALUATED'`)
    .bind(task.task_id).all<{ event_key: string; decision: "ALLOW" | "DENY" | "ESCALATE" }>();
  for (const row of results.results ?? []) {
    if (row.decision === "ALLOW") {
      await recordPromotionTransition(env.DB, row.event_key, "AUTHORIZED", "All expected agents completed with no Git conflict");
    } else if (row.decision === "DENY") {
      await recordPromotionTransition(env.DB, row.event_key, "BLOCKED", "Gatekeeper denied commit");
    } else {
      const approval = await env.DB.prepare("SELECT approval_id FROM approvals WHERE event_key = ?")
        .bind(row.event_key).first<{ approval_id: string }>();
      if (approval) await recordPromotionTransition(env.DB, row.event_key, "FROZEN", "Human approval is pending");
    }
  }
}

export async function processPushEvent(env: Env, event: ArtifactsPushEvent): Promise<Record<string, unknown>> {
  const accountId = event.metadata?.accountId ?? env.CLOUDFLARE_ACCOUNT_ID;
  if (event.type !== "cf.artifacts.repo.pushed" || !accountId ||
      !event.source?.namespace || !event.source.repoName || !event.payload?.ref ||
      !/^[0-9a-f]{40}$/.test(event.payload.after)) throw new Error("Invalid Artifacts push event");
  if (event.metadata?.accountId && event.metadata.accountId !== env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("Push event account does not match the configured account");
  }

  const captured = await persistEvent(env.DB, event, accountId);
  if (!captured.process) {
    const existingPromotion = await env.DB.prepare(`SELECT p.state, d.decision FROM promotions p
      LEFT JOIN decisions d ON d.event_key = p.event_key WHERE p.event_key = ?`)
      .bind(captured.key).first<{ state: string; decision: string | null }>();
    return { eventKey: captured.key, status: captured.status, decision: captured.existingDecision ?? existingPromotion?.decision,
      promotionState: existingPromotion?.state, duplicate: true };
  }

  try {
    if (event.source.namespace !== "cortex-git" || accountId !== env.CLOUDFLARE_ACCOUNT_ID) {
      throw new Error("Push event does not belong to the configured account and namespace");
    }
    const key = captured.key;
    const workspace = await env.DB.prepare(`SELECT * FROM workspaces
      WHERE account_id = ? AND namespace = ? AND repository = ?`)
      .bind(accountId, event.source.namespace, event.source.repoName).first<WorkspaceRow>();
    if (!workspace) {
      await env.DB.prepare(`UPDATE governance_events SET status = 'IGNORED_UNASSOCIATED_REPO', processed_at = ? WHERE event_key = ?`)
        .bind(nowIso(), key).run();
      return { eventKey: key, status: "IGNORED_UNASSOCIATED_REPO" };
    }

    const [task, agent, attestation] = await Promise.all([
      env.DB.prepare(`SELECT * FROM tasks WHERE account_id = ? AND namespace = ? AND task_id = ?`)
        .bind(workspace.account_id, workspace.namespace, workspace.task_id).first<TaskRow>(),
      env.DB.prepare(`SELECT * FROM agents WHERE account_id = ? AND agent_id = ?`)
        .bind(workspace.account_id, workspace.agent_id).first<AgentRow>(),
      env.DB.prepare(`SELECT signature_hex FROM attestations WHERE account_id = ? AND namespace = ?
        AND repository = ? AND ref = ? AND commit_sha = ?`)
        .bind(workspace.account_id, workspace.namespace, workspace.repository, event.payload.ref, event.payload.after)
        .first<{ signature_hex: string }>(),
    ]);
    if (!task || !agent) throw new Error("Workspace identity is incomplete");

    const repo = await env.ARTIFACTS.get(event.source.repoName);
    const evidence = await readCommitEvidence(repo, event.payload.after);
    const agentIdentity: AgentIdentity = {
      agentId: agent.agent_id,
      name: agent.name,
      model: agent.model,
      publicKey: agent.public_key,
      trustTier: "STANDARD",
      createdTimestamp: Date.parse(agent.created_at),
    };
    const gatekeeper = new CortexGatekeeper();
    const revocationRegistry = env.CORTEX_KV ? new RevocationRegistry(env.CORTEX_KV) : undefined;
    const outcome = await gatekeeper.evaluateCommit({
      repo: event.source.repoName,
      branch: event.payload.ref,
      commitHash: evidence.commit.hash,
      parentCommitHash: evidence.commit.parents[0] ?? "0000000000000000000000000000000000000000",
      authorAgent: agentIdentity,
      promptText: task.description,
      diff: evidence.diff,
      modifiedFiles: evidence.changedPaths,
      signatureHex: attestation?.signature_hex ?? "",
      revocationRegistry,
    });
    const decision = outcome.decision === "ALLOW" ? "ALLOW" :
      outcome.decision === "DENIED" ? "DENY" : "ESCALATE";

    await env.DB.prepare(`INSERT OR IGNORE INTO commits
      (event_key, parent_sha, agent_id, task_id, commit_metadata_json, changed_paths_json,
       content_sha256, evaluation_status, retrieved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'EVALUATED', ?)`)
      .bind(key, evidence.commit.parents[0] ?? "", agent.agent_id, task.task_id,
        canonicalJson(evidence.commit), JSON.stringify(evidence.changedPaths), evidence.contentSha256, nowIso()).run();
    await env.DB.prepare(`INSERT OR IGNORE INTO decisions (event_key, decision, outcome_json, decided_at)
      VALUES (?, ?, ?, ?)`)
      .bind(key, decision, canonicalJson(outcome), nowIso()).run();
    await recordPromotionTransition(env.DB, key, "PENDING", "Commit content retrieved by SHA from Artifacts");

    const resolved = await completeResolutionIfPresent(env, task, event, evidence.commit, key);
    if (decision === "DENY") {
      await recordPromotionTransition(env.DB, key, "BLOCKED", "Gatekeeper denied retrieved commit content");
    } else if (decision === "ESCALATE") {
      await createApproval(env.DB, key, event, outcome.quorumRequired?.requiredApprovals ?? 1, accountId);
      await recordPromotionTransition(env.DB, key, "FROZEN", "Human approval quorum is pending");
    } else if (resolved) {
      await recordPromotionTransition(env.DB, key, "AUTHORIZED", "Resolution commit passed a new governance cycle");
    } else if (task.status === "RESOLUTION_PENDING") {
      await recordPromotionTransition(env.DB, key, "CONFLICT", "This push does not descend from either conflicted candidate");
    } else if (task.expected_agents <= 1) {
      await recordPromotionTransition(env.DB, key, "AUTHORIZED", "Gatekeeper allowed retrieved commit content");
      await env.DB.prepare("UPDATE tasks SET status = 'COMPLETE' WHERE account_id = ? AND namespace = ? AND task_id = ?")
        .bind(task.account_id, task.namespace, task.task_id).run();
    } else {
      const conflict = await checkTaskConflicts(env, task);
      if (conflict) {
        for (const candidate of conflict.candidates) {
          await recordPromotionTransition(env.DB, candidate.event_key, "CONFLICT", "Divergent Git edits conflict with the common base");
        }
      } else {
        const count = await env.DB.prepare(`SELECT COUNT(DISTINCT agent_id) AS count FROM commits
          WHERE task_id = ? AND evaluation_status = 'EVALUATED'`).bind(task.task_id).first<{ count: number }>();
        if ((count?.count ?? 0) >= task.expected_agents) {
          await env.DB.prepare("UPDATE tasks SET status = 'COMPLETE' WHERE account_id = ? AND namespace = ? AND task_id = ?")
            .bind(task.account_id, task.namespace, task.task_id).run();
          await finalizeCandidatePromotions(env, task);
        }
      }
    }

    await env.DB.prepare("UPDATE governance_events SET status = 'DECIDED', processed_at = ? WHERE event_key = ?")
      .bind(nowIso(), key).run();
    const promotion = await env.DB.prepare("SELECT state FROM promotions WHERE event_key = ?")
      .bind(key).first<{ state: string }>();
    return { eventKey: key, decision, promotionState: promotion?.state, changedPaths: evidence.changedPaths,
      contentSha256: evidence.contentSha256, outcome };
  } catch (error) {
    await env.DB.prepare(`UPDATE governance_events SET status = 'FAILED', anomaly_json = ?, processed_at = ?
      WHERE event_key = ? AND status = 'PROCESSING'`)
      .bind(JSON.stringify({ type: "PROCESSING_FAILED", message: error instanceof Error ? error.message : "unknown" }), nowIso(), captured.key).run();
    throw error;
  }
}

export async function expireApprovals(env: Env): Promise<number> {
  const pending = await env.DB.prepare(`SELECT approval_id, event_key FROM approvals
    WHERE status = 'PENDING_HUMAN_APPROVAL' AND expires_at <= ?`).bind(nowIso())
    .all<{ approval_id: string; event_key: string }>();
  let expired = 0;
  for (const approval of pending.results ?? []) {
    const result = await env.DB.prepare(`UPDATE approvals SET status = 'EXPIRED'
      WHERE approval_id = ? AND status = 'PENDING_HUMAN_APPROVAL' AND expires_at <= ?`)
      .bind(approval.approval_id, nowIso()).run();
    if ((result.meta.changes ?? 0) !== 1) continue;
    await recordPromotionTransition(env.DB, approval.event_key, "BLOCKED", "Approval expired without quorum");
    expired += 1;
  }
  return expired;
}

export async function recordApprovalVote(
  env: Env,
  approvalId: string,
  token: string,
  decision: "APPROVED" | "REJECTED",
): Promise<Record<string, unknown>> {
  const tokenHash = await CortexCrypto.sha256(token);
  const approver = await env.DB.prepare(`SELECT approver_id FROM approvers
    WHERE account_id = ? AND token_hash = ? AND revoked_at IS NULL`)
    .bind(env.CLOUDFLARE_ACCOUNT_ID, tokenHash).first<{ approver_id: string }>();
  if (!approver) throw new Error("Approver authentication failed");

  const approval = await env.DB.prepare("SELECT * FROM approvals WHERE approval_id = ?")
    .bind(approvalId).first<{
      approval_id: string; event_key: string; status: string; expires_at: string;
      required_approvals: number; received_approvals: number;
    }>();
  if (!approval) throw new Error("Approval not found");
  if (approval.status !== "PENDING_HUMAN_APPROVAL") return { approvalId, status: approval.status, duplicate: true };
  if (Date.parse(approval.expires_at) <= Date.now()) {
    await env.DB.prepare("UPDATE approvals SET status = 'EXPIRED' WHERE approval_id = ? AND status = 'PENDING_HUMAN_APPROVAL'")
      .bind(approvalId).run();
    await recordPromotionTransition(env.DB, approval.event_key, "BLOCKED", "Approval expired before vote");
    return { approvalId, status: "EXPIRED" };
  }

  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO approval_votes
    (approval_id, approver_id, decision, signed_at) VALUES (?, ?, ?, ?)`)
    .bind(approvalId, approver.approver_id, decision, nowIso()).run();
  if ((inserted.meta.changes ?? 0) !== 1) return { approvalId, status: approval.status, duplicate: true };

  if (decision === "REJECTED") {
    await env.DB.prepare("UPDATE approvals SET received_approvals = received_approvals + 1, status = 'REJECTED' WHERE approval_id = ? AND status = 'PENDING_HUMAN_APPROVAL'")
      .bind(approvalId).run();
    await recordPromotionTransition(env.DB, approval.event_key, "BLOCKED", `Rejected by authenticated approver ${approver.approver_id}`);
    return { approvalId, status: "REJECTED", promotionState: "BLOCKED" };
  }

  const increment = await env.DB.prepare(`UPDATE approvals SET received_approvals = received_approvals + 1
    WHERE approval_id = ? AND status = 'PENDING_HUMAN_APPROVAL' AND received_approvals < required_approvals`)
    .bind(approvalId).run();
  if ((increment.meta.changes ?? 0) !== 1) return { approvalId, status: "PENDING_HUMAN_APPROVAL", duplicate: true };
  const current = await env.DB.prepare("SELECT received_approvals, required_approvals FROM approvals WHERE approval_id = ?")
    .bind(approvalId).first<{ received_approvals: number; required_approvals: number }>();
  if (current && current.received_approvals >= current.required_approvals) {
    await env.DB.prepare("UPDATE approvals SET status = 'APPROVED' WHERE approval_id = ? AND status = 'PENDING_HUMAN_APPROVAL'")
      .bind(approvalId).run();
    await recordPromotionTransition(env.DB, approval.event_key, "AUTHORIZED", "Authenticated approval quorum reached");
    return { approvalId, status: "APPROVED", promotionState: "AUTHORIZED" };
  }
  return { approvalId, status: "PENDING_HUMAN_APPROVAL", receivedApprovals: current?.received_approvals };
}
