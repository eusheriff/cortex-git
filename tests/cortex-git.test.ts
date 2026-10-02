import test from "node:test";
import assert from "node:assert/strict";
import { CortexCrypto } from "../src/crypto.js";
import { CortexArbiter } from "../src/arbiter.js";
import { CortexGatekeeper } from "../src/gatekeeper.js";
import { CortexConsensus } from "../src/consensus.js";
import { ArtifactsNamespaceBinding, TaskIntent, AgentIdentity } from "../src/types.js";

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
  assert.equal(outcome.gates[0].passed, false);
  assert.ok(outcome.gates[0].reason.includes("secret"));
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
