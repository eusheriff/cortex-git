import test from "node:test";
import assert from "node:assert/strict";
import { CortexCrypto } from "../src/crypto.js";
import { CortexArbiter } from "../src/arbiter.js";
import { CortexGatekeeper } from "../src/gatekeeper.js";
import { CortexConsensus } from "../src/consensus.js";
import { detectLineConflicts } from "../src/conflicts.js";
import { eventIdentity } from "../src/artifact-evidence.js";
import { ArtifactsNamespaceBinding, TaskIntent, AgentIdentity } from "../src/types.js";
import { RevocationRegistry, RevocationKVBinding } from "../src/revocation.js";
import {
  parseOrCreateTraceContext,
  attachTraceHeaders,
  generateTraceId,
  generateSpanId,
} from "../src/telemetry.js";

// Mock binding
const mockArtifacts: ArtifactsNamespaceBinding = {
  async get(repoName: string) {
    return {
      async info() { return { name: repoName, defaultBranch: "main" }; },
      async fork(name: string) { return { name, remote: `https://artifacts.cloudflare.com/${name}.git`, token: "tok" }; },
      async createToken() { return { id: "tok_1", token: "art_test" }; },
      async listTokens() { return []; },
      async revokeToken() { return true; },
      async log() { return []; },
      async readCommit() { return null; },
      async readTree() { return []; },
      async readBlob() { return null; },
      async readFile() { return new Blob(["# AGENTS"]); },
    };
  },
  async create(repoName: string) { return { name: repoName, remote: `https://${repoName}.git`, token: "tok" }; },
  async list() { return { repos: [] }; },
  async delete() {},
};

test("CortexCrypto: generates Ed25519 keypair and verifies valid signatures", async () => {
  const { publicKeyHex, privateKey } = await CortexCrypto.generateAgentKeypair();
  assert.ok(publicKeyHex.length === 64, "Public key should be 32 bytes hex");

  const message = "cloudflare-artifacts:commit-100:agent-alpha";
  const signatureHex = await CortexCrypto.signPayload(message, privateKey);
  assert.ok(signatureHex.length === 128, "Signature should be 64 bytes hex");

  const isValid = await CortexCrypto.verifySignature(message, signatureHex, publicKeyHex);
  assert.equal(isValid, true, "Signature should verify successfully");

  const isInvalid = await CortexCrypto.verifySignature("tampered-message", signatureHex, publicKeyHex);
  assert.equal(isInvalid, false, "Tampered message should fail verification");
});

test("CortexCrypto: builds Merkle Tree and proves SPV inclusion", async () => {
  const leaves = [
    await CortexCrypto.sha256("leaf-0"),
    await CortexCrypto.sha256("leaf-1"),
    await CortexCrypto.sha256("leaf-2"),
    await CortexCrypto.sha256("leaf-3"),
  ];

  const tree = await CortexCrypto.buildMerkleTree(leaves);
  assert.ok(tree.hash.length === 64, "Merkle root should be valid SHA-256");

  for (let i = 0; i < leaves.length; i++) {
    const proof = await CortexCrypto.generateSPVProof(leaves, i);
    assert.equal(proof.merkleRoot, tree.hash);
    const valid = await CortexCrypto.verifySPVProof(proof);
    assert.equal(valid, true, `SPV proof for leaf ${i} must verify`);
  }
});

test("governance identity is account/repository/ref/commit scoped", () => {
  const identity = eventIdentity({ accountId: "acct", namespace: "ns", repository: "repo", ref: "refs/heads/main", commitSha: "a".repeat(40) });
  assert.equal(identity, `acct:ns:repo:refs/heads/main:${"a".repeat(40)}`);
  assert.notEqual(identity, eventIdentity({ accountId: "other", namespace: "ns", repository: "repo", ref: "refs/heads/main", commitSha: "a".repeat(40) }));
});

test("Git conflict detection requires divergent overlapping line edits from a common base", () => {
  const base = "mode=base\nstatus=stable\n";
  const candidateA = "mode=agent-a\nstatus=stable\n";
  const candidateB = "mode=agent-b\nstatus=stable\n";
  const conflicts = detectLineConflicts("src/shared.txt", base, candidateA, candidateB);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].baseStartLine, 1);
  assert.deepEqual(conflicts[0].candidateA, ["mode=agent-a"]);
  assert.deepEqual(conflicts[0].candidateB, ["mode=agent-b"]);
  assert.deepEqual(detectLineConflicts("src/shared.txt", base, candidateA, candidateA), []);
  assert.deepEqual(detectLineConflicts("src/shared.txt", base, "mode=base\nstatus=agent-a\n", "mode=agent-b\nstatus=stable\n"), []);
});

test("CortexArbiter: triages non-overlapping tasks concurrently and isolates workspaces", async () => {
  const arbiter = new CortexArbiter(mockArtifacts);

  const taskA: TaskIntent = {
    taskId: "t-a",
    agentId: "agent-a",
    repo: "my-app",
    description: "auth",
    targetFiles: ["src/auth.ts"],
    expectedModifications: ["src/auth.ts"],
    safetyConstraints: [],
    timestamp: Date.now(),
  };

  const taskB: TaskIntent = {
    taskId: "t-b",
    agentId: "agent-b",
    repo: "my-app",
    description: "billing",
    targetFiles: ["src/billing.ts"],
    expectedModifications: ["src/billing.ts"],
    safetyConstraints: [],
    timestamp: Date.now(),
  };

  const resA = await arbiter.triageIntent(taskA);
  const resB = await arbiter.triageIntent(taskB);

  assert.equal(resA.allowedConcurrently, true);
  assert.equal(resB.allowedConcurrently, true);
  assert.equal(resA.conflictRisk, "LOW");
  assert.equal(resB.conflictRisk, "LOW");
  assert.notEqual(resA.assignedWorkspace, resB.assignedWorkspace);
});

test("CortexGatekeeper: blocks commits containing hardcoded secrets (Gate 01)", async () => {
  const gatekeeper = new CortexGatekeeper();
  const { publicKeyHex, privateKey } = await CortexCrypto.generateAgentKeypair();

  const author: AgentIdentity = {
    agentId: "agent-bad",
    name: "Bad Agent",
    model: "test-model",
    publicKey: publicKeyHex,
    trustTier: "RESTRICTED",
    createdTimestamp: Date.now(),
  };

  const commitHash = await CortexCrypto.sha256("leak-secret");
  const signatureHex = await CortexCrypto.signPayload(`my-app:${commitHash}:${author.agentId}`, privateKey);

  const outcome = await gatekeeper.evaluateCommit({
    repo: "my-app",
    branch: "bad-branch",
    commitHash,
    parentCommitHash: "000",
    authorAgent: author,
    promptText: "Fix bug",
    diff: "+ const token = 'ghp_123456789012345678901234567890123456';",
    modifiedFiles: ["src/config.ts"],
    signatureHex,
  });

  assert.equal(outcome.decision, "DENIED");
  const secretGate = outcome.gates.find((g) => g.gateName === "SECRET_SCANNER");
  assert.ok(secretGate, "SECRET_SCANNER gate must be present");
  assert.equal(secretGate.passed, false);
  assert.ok(secretGate.reason.includes("secret"));
});

test("CortexGatekeeper: enforces Human Quorum on critical infrastructure files (Gate 04)", async () => {
  const gatekeeper = new CortexGatekeeper();
  const { publicKeyHex, privateKey } = await CortexCrypto.generateAgentKeypair();

  const author: AgentIdentity = {
    agentId: "agent-migrator",
    name: "DB Agent",
    model: "test-model",
    publicKey: publicKeyHex,
    trustTier: "STANDARD",
    createdTimestamp: Date.now(),
  };

  const commitHash = await CortexCrypto.sha256("clean-migration");
  const signatureHex = await CortexCrypto.signPayload(`my-app:${commitHash}:${author.agentId}`, privateKey);

  const outcome = await gatekeeper.evaluateCommit({
    repo: "my-app",
    branch: "mig-branch",
    commitHash,
    parentCommitHash: "000",
    authorAgent: author,
    promptText: "Add table",
    diff: "+ CREATE TABLE users (id INT PRIMARY KEY);",
    modifiedFiles: ["migrations/001_init.sql"],
    signatureHex,
  });

  assert.equal(outcome.decision, "QUORUM_REQUIRED");
  assert.ok(outcome.quorumRequired);
  assert.equal(outcome.quorumRequired?.requiredApprovals, 2);
});

test("CortexConsensus: selects optimal agent solution based on multi-dimensional criteria", async () => {
  const { publicKeyHex } = await CortexCrypto.generateAgentKeypair();
  const agentA: AgentIdentity = {
    agentId: "ag-a",
    name: "Simple Clean",
    model: "claude-3-5",
    publicKey: publicKeyHex,
    trustTier: "STANDARD",
    createdTimestamp: Date.now(),
  };

  const agentB: AgentIdentity = {
    agentId: "ag-b",
    name: "Complex Bloat",
    model: "other",
    publicKey: publicKeyHex,
    trustTier: "STANDARD",
    createdTimestamp: Date.now(),
  };

  const consensus = await CortexConsensus.evaluateCandidates("Refactor query engine", [
    {
      agent: agentA,
      branch: "b-a",
      commitHash: "c-a",
      rationale: "Clean 10-line change",
      diffSummary: { additions: 10, deletions: 2, filesModified: 1 },
      metrics: { testsPassed: true, codeComplexityScore: 2, securityScore: 100, benchmarkLatencyImprovementMs: 5 },
    },
    {
      agent: agentB,
      branch: "b-b",
      commitHash: "c-b",
      rationale: "300-line complicated abstraction",
      diffSummary: { additions: 350, deletions: 100, filesModified: 8 },
      metrics: { testsPassed: true, codeComplexityScore: 25, securityScore: 80, benchmarkLatencyImprovementMs: 1 },
    },
  ]);

  assert.equal(consensus.winningProposal.agent.agentId, "ag-a");
  assert.ok(consensus.compositeScore > 80);
});

function createMockKV(): RevocationKVBinding {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) || null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

test("Telemetry: generates standards-compliant W3C traceparent and context", () => {
  const traceId = generateTraceId();
  assert.equal(traceId.length, 32);
  assert.match(traceId, /^[0-9a-f]{32}$/);

  const spanId = generateSpanId();
  assert.equal(spanId.length, 16);
  assert.match(spanId, /^[0-9a-f]{16}$/);

  const fresh = parseOrCreateTraceContext(null);
  assert.equal(fresh.traceId.length, 32);
  assert.equal(fresh.spanId.length, 16);
  assert.equal(fresh.traceFlags, "01");
  assert.equal(fresh.traceparent, `00-${fresh.traceId}-${fresh.spanId}-01`);

  // Parse existing inbound traceparent
  const inboundTraceId = "4bf92f3577b34da6a3ce929d0e0e4736";
  const inboundSpanId = "00f067aa0ba902b7";
  const mockReq = new Request("http://localhost", {
    headers: {
      traceparent: `00-${inboundTraceId}-${inboundSpanId}-01`,
    },
  });

  const parsed = parseOrCreateTraceContext(mockReq);
  assert.equal(parsed.traceId, inboundTraceId);
  assert.equal(parsed.parentSpanId, inboundSpanId);
  assert.notEqual(parsed.spanId, inboundSpanId, "Child spanId must be newly generated");
  assert.equal(parsed.traceparent, `00-${inboundTraceId}-${parsed.spanId}-01`);

  const headers = new Headers();
  attachTraceHeaders(headers, parsed);
  assert.equal(headers.get("traceparent"), parsed.traceparent);
  assert.equal(headers.get("x-abs-trace-id"), inboundTraceId);
  assert.equal(headers.get("x-cortex-trace-id"), inboundTraceId);
});

test("RevocationRegistry: sub-2ms edge revocation and emergency kill-switch", async () => {
  const kv = createMockKV();
  const registry = new RevocationRegistry(kv);

  const { publicKeyHex } = await CortexCrypto.generateAgentKeypair();

  // 1. Initial clear state
  const clearCheck = await registry.checkRevocation(publicKeyHex, "core-repo");
  assert.equal(clearCheck, null);

  // 2. Global killswitch
  await registry.setGlobalKillSwitch(true, "Security breach test");
  const blockedGlobal = await registry.checkRevocation(publicKeyHex, "core-repo");
  assert.ok(blockedGlobal);
  assert.equal(blockedGlobal?.type, "GLOBAL");
  assert.equal(blockedGlobal?.revoked, true);

  // Clear global killswitch
  await registry.setGlobalKillSwitch(false);
  const clearedGlobal = await registry.checkRevocation(publicKeyHex, "core-repo");
  assert.equal(clearedGlobal, null);

  // 3. Repository killswitch
  await registry.setRepoKillSwitch("frozen-repo", true, "Branch locked for audit");
  const blockedRepo = await registry.checkRevocation(publicKeyHex, "frozen-repo");
  assert.ok(blockedRepo);
  assert.equal(blockedRepo?.type, "REPOSITORY");
  assert.equal(blockedRepo?.target, "frozen-repo");

  const unblockedOtherRepo = await registry.checkRevocation(publicKeyHex, "other-repo");
  assert.equal(unblockedOtherRepo, null);

  // 4. Agent key revocation
  await registry.revokeAgent(publicKeyHex, "Compromised key", "admin-secops");
  const blockedAgent = await registry.checkRevocation(publicKeyHex, "other-repo");
  assert.ok(blockedAgent);
  assert.equal(blockedAgent?.type, "AGENT");
  assert.equal(blockedAgent?.target, publicKeyHex.toLowerCase());
});

test("CortexGatekeeper: Gate 00 instantly fails-closed on revoked agent key", async () => {
  const gatekeeper = new CortexGatekeeper();
  const kv = createMockKV();
  const registry = new RevocationRegistry(kv);

  const { publicKeyHex, privateKey } = await CortexCrypto.generateAgentKeypair();
  await registry.revokeAgent(publicKeyHex, "Revoked rogue agent", "security-team");

  const author: AgentIdentity = {
    agentId: "agent-rogue",
    name: "Rogue Agent",
    model: "test-model",
    publicKey: publicKeyHex,
    trustTier: "RESTRICTED",
    createdTimestamp: Date.now(),
  };

  const commitHash = await CortexCrypto.sha256("benign-commit");
  const signatureHex = await CortexCrypto.signPayload(`secure-repo:${commitHash}:${author.agentId}`, privateKey);

  const outcome = await gatekeeper.evaluateCommit({
    repo: "secure-repo",
    branch: "main",
    commitHash,
    parentCommitHash: "000",
    authorAgent: author,
    promptText: "Add innocuous helper",
    diff: "+ export function help() { return true; }",
    modifiedFiles: ["src/helper.ts"],
    signatureHex,
    revocationRegistry: registry,
  });

  assert.equal(outcome.decision, "DENIED");
  assert.equal(outcome.gates[0].gateNumber, 0);
  assert.equal(outcome.gates[0].gateName, "REVOCATION_AND_KILLSWITCH");
  assert.equal(outcome.gates[0].passed, false);
  assert.ok(outcome.gates[0].reason.includes("FAIL-CLOSED"));
  assert.equal(outcome.gates.length, 1, "Must short-circuit immediately without evaluating other gates");
});

