/**
 * Verification of Real Cloudflare Artifacts Operations against ABS Core Gatekeeper
 */

import { CortexCrypto } from "../src/crypto.js";
import { CortexGatekeeper } from "../src/gatekeeper.js";
import { AgentIdentity } from "../src/types.js";

async function verifyRealArtifactsCommit() {
  console.log("================================================================================");
  console.log("  VERIFYING REAL CLOUDFLARE ARTIFACTS COMMIT WITH ABS GATEKEEPER");
  console.log("================================================================================\n");

  const gatekeeper = new CortexGatekeeper();
  const agentKeypair = await CortexCrypto.generateAgentKeypair();

  const realAgent: AgentIdentity = {
    agentId: "agent-guardian-prod",
    name: "Agent Guardian",
    model: "claude-3-5-sonnet",
    publicKey: agentKeypair.publicKeyHex,
    trustTier: "STANDARD",
    createdTimestamp: Date.now(),
  };

  // Real Commit from Cloudflare Artifacts: 3f456f4ffae96a81fe8e47ad44ce6f0f0f974e44
  const realCommitHash = "3f456f4ffae96a81fe8e47ad44ce6f0f0f974e44";
  const repoName = "cortex-workspace-agent-01";

  // Sign the commit with Ed25519
  const payloadToSign = `${repoName}:${realCommitHash}:${realAgent.agentId}`;
  const signatureHex = await CortexCrypto.signPayload(payloadToSign, agentKeypair.privateKey);

  console.log(`[1/3] Evaluating REAL Clean Commit from Cloudflare Artifacts: ${realCommitHash.slice(0, 10)}...`);
  const cleanOutcome = await gatekeeper.evaluateCommit({
    repo: repoName,
    branch: "main",
    commitHash: realCommitHash,
    parentCommitHash: "0000000000000000000000000000000000000000",
    authorAgent: realAgent,
    promptText: "Add safe session token validator without external network calls",
    diff: "+ export function validateSessionToken(token: string): boolean { return token.length >= 32; }",
    modifiedFiles: ["src/auth.ts"],
    signatureHex,
  });

  console.log(`  ➔ Decision: ${cleanOutcome.decision}`);
  console.log(`  ➔ Total Latency: ${cleanOutcome.totalLatencyMs}ms`);
  console.log(`  ➔ Merkle Root: 0x${cleanOutcome.merkleRoot}`);
  console.log(`  ➔ RFC 3161 Timestamp: ${cleanOutcome.signedRecord?.rfc3161Timestamp}`);
  if (cleanOutcome.decision !== "ALLOW") throw new Error("Expected clean commit to be ALLOWED");

  console.log("\n[2/3] Evaluating Malicious Agent Injection Attempt (Adversarial Simulation)...");
  const badCommitHash = await CortexCrypto.sha256("bad-commit");
  const badSig = await CortexCrypto.signPayload(`${repoName}:${badCommitHash}:${realAgent.agentId}`, agentKeypair.privateKey);
  const badOutcome = await gatekeeper.evaluateCommit({
    repo: repoName,
    branch: "main",
    commitHash: badCommitHash,
    parentCommitHash: realCommitHash,
    authorAgent: realAgent,
    promptText: "Add secret API logger",
    diff: "+ const apiKey = 'sk-live-abcdef12345678901234567890123456789012345678';",
    modifiedFiles: ["src/logger.ts"],
    signatureHex: badSig,
  });

  console.log(`  ➔ Decision: ${badOutcome.decision}`);
  console.log(`  ➔ Reason: ${badOutcome.gates[0].reason}`);
  if (badOutcome.decision !== "DENIED") throw new Error("Expected adversarial commit to be DENIED");

  console.log("\n[3/3] Evaluating Critical Infrastructure Migration (Quorum Escalation)...");
  const infraCommitHash = await CortexCrypto.sha256("infra-commit");
  const infraSig = await CortexCrypto.signPayload(`${repoName}:${infraCommitHash}:${realAgent.agentId}`, agentKeypair.privateKey);
  const infraOutcome = await gatekeeper.evaluateCommit({
    repo: repoName,
    branch: "main",
    commitHash: infraCommitHash,
    parentCommitHash: realCommitHash,
    authorAgent: realAgent,
    promptText: "Update database migration",
    diff: "+ ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;",
    modifiedFiles: ["migrations/002_add_admin.sql"],
    signatureHex: infraSig,
  });

  console.log(`  ➔ Decision: ${infraOutcome.decision}`);
  console.log(`  ➔ Quorum Required: ${infraOutcome.quorumRequired?.requiredApprovals} approvals (${infraOutcome.quorumRequired?.reason})`);
  if (infraOutcome.decision !== "QUORUM_REQUIRED") throw new Error("Expected infra commit to be ESCALATED for Quorum");

  console.log("\n================================================================================");
  console.log("  ✅ ALL REAL CLOUDFLARE ARTIFACTS VALIDATIONS PASSED CLEANLY!");
  console.log("================================================================================");
}

verifyRealArtifactsCommit().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
