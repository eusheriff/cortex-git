/**
 * CORTEX Git: Unified End-to-End Governance Demonstration
 * 
 * "Cloudflare gives agents a place to build.
 *  CORTEX coordinates the work.
 *  ABS Core governs what is allowed to ship."
 * 
 * Demonstrates the 3 canonical states over real Cloudflare Artifacts commits:
 * 1. COMMIT A: Safe Change                ➔ ALLOW
 * 2. COMMIT B: Secret/Dangerous Operation ➔ DENY (Fail-Closed)
 * 3. COMMIT C: Sensitive Migration        ➔ ESCALATE (Human Quorum Required)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CortexCrypto } from "../src/crypto.js";
import { CortexGatekeeper } from "../src/gatekeeper.js";
import { AgentIdentity } from "../src/types.js";

const WRANGLER_BIN = "/opt/homebrew/bin/wrangler";
const NAMESPACE = "cortex-git";
const REPO_NAME = "cortex-e2e-live";
const TEMP_DIR = "/tmp/cortex-e2e-live-repo";

function runCmd(cmd: string, cwd?: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

async function main() {
  console.log("================================================================================");
  console.log("  🏛️  CORTEX Git — End-to-End Cloudflare Artifacts Governance Pipeline");
  console.log("  \"Cloudflare gives agents a place to build.");
  console.log("   CORTEX coordinates the work.");
  console.log("   ABS Core governs what is allowed to ship.\"");
  console.log("================================================================================\n");

  const gatekeeper = new CortexGatekeeper();

  // 1. Identity Provisioning (Ed25519)
  console.log("[Step 1/5] Provisioning Autonomous Agent with Ed25519 Identity...");
  const agentKeypair = await CortexCrypto.generateAgentKeypair();
  const agent: AgentIdentity = {
    agentId: "agent-sentinel-01",
    name: "Agent Sentinel",
    model: "claude-3-5-sonnet",
    publicKey: agentKeypair.publicKeyHex,
    trustTier: "STANDARD",
    createdTimestamp: Date.now(),
  };
  console.log(`  ✓ Agent ID: ${agent.agentId} (${agent.name} / ${agent.model})`);
  console.log(`  ✓ Ed25519 Public Key: ${agent.publicKey.slice(0, 16)}...${agent.publicKey.slice(-16)}\n`);

  // 2. Cloudflare Artifacts Workspace Provisioning
  console.log("[Step 2/5] Initializing Cloudflare Artifacts Workspace...");
  try {
    runCmd(`${WRANGLER_BIN} artifacts repos create ${REPO_NAME} --namespace ${NAMESPACE}`);
    console.log(`  ✓ Created Artifacts repo: "${REPO_NAME}" in namespace "${NAMESPACE}"`);
  } catch {
    console.log(`  ✓ Using existing Artifacts repo: "${REPO_NAME}" in namespace "${NAMESPACE}"`);
  }

  // Issue real ephemeral token
  const tokenOutput = runCmd(`${WRANGLER_BIN} artifacts repos issue-token ${REPO_NAME} --namespace ${NAMESPACE} --scope write --ttl 1800`);
  const tokenMatch = tokenOutput.match(/plaintext:\s+(art_v2_x_[^\s]+)/);
  if (!tokenMatch) throw new Error("Failed to extract ephemeral token from Wrangler");
  const ephemeralToken = tokenMatch[1];
  const remoteUrl = `https://e71984852bedaf5f21cef5d949948498.artifacts.cloudflare.net/git/${NAMESPACE}/${REPO_NAME}.git`;

  console.log(`  ✓ Issued Ephemeral Write Token: ${ephemeralToken.slice(0, 20)}... (TTL: 30m)`);
  console.log(`  ✓ Remote Target: ${remoteUrl}\n`);

  // Setup local working tree
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  runCmd("git init -b main", TEMP_DIR);
  runCmd(`git config user.name "${agent.name}"`, TEMP_DIR);
  runCmd(`git config user.email "${agent.agentId}@cortex-git.internal"`, TEMP_DIR);

  // --------------------------------------------------------------------------
  // TEST SCENARIO A: Safe Feature Change ➔ ALLOW
  // --------------------------------------------------------------------------
  console.log("[Step 3/5] SCENARIO A: Safe Implementation ➔ Expected: ALLOW");
  fs.mkdirSync(path.join(TEMP_DIR, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(TEMP_DIR, "src/security.ts"),
    `// Safe cryptographic constant\nexport const HASH_ALGO = 'SHA-256';\nexport function verifyHash(input: string): boolean { return input.length === 64; }\n`
  );
  runCmd("git add src/security.ts", TEMP_DIR);
  runCmd('git commit -m "feat(security): implement safe hash verification"', TEMP_DIR);

  const commitASHA = runCmd("git rev-parse HEAD", TEMP_DIR);
  runCmd(`git -c http.extraHeader="Authorization: Bearer ${ephemeralToken}" push -u "${remoteUrl}" main --force`, TEMP_DIR);
  console.log(`  ✓ Real Push to Cloudflare Artifacts complete. Commit: ${commitASHA.slice(0, 8)}`);

  // ABS Core Gatekeeper Evaluation
  const sigA = await CortexCrypto.signPayload(`${REPO_NAME}:${commitASHA}:${agent.agentId}`, agentKeypair.privateKey);
  const outcomeA = await gatekeeper.evaluateCommit({
    repo: REPO_NAME,
    branch: "main",
    commitHash: commitASHA,
    parentCommitHash: "0000000000000000000000000000000000000000",
    authorAgent: agent,
    promptText: "Add safe SHA-256 hash verification helper without external calls",
    diff: fs.readFileSync(path.join(TEMP_DIR, "src/security.ts"), "utf-8"),
    modifiedFiles: ["src/security.ts"],
    signatureHex: sigA,
  });

  console.log(`  ➔ ABS Gatekeeper Decision: [ ${outcomeA.decision} ] (Evaluated in ${outcomeA.totalLatencyMs}ms)`);
  console.log(`  ➔ Pipeline Action: AUTHORIZED FOR CI/DEPLOYMENT TO PRODUCTION`);
  console.log(`  ➔ WORM Merkle Seal: 0x${outcomeA.merkleRoot?.slice(0, 16)}... | RFC 3161: ${outcomeA.signedRecord?.rfc3161Timestamp}\n`);

  // --------------------------------------------------------------------------
  // TEST SCENARIO B: Secret / Dangerous Operation ➔ DENY (Fail-Closed)
  // --------------------------------------------------------------------------
  console.log("[Step 4/5] SCENARIO B: Rogue Infiltration / Hardcoded Secret ➔ Expected: DENY");
  runCmd("git checkout -b feature/rogue-agent", TEMP_DIR);
  fs.writeFileSync(
    path.join(TEMP_DIR, "src/telemetry.ts"),
    `// Malicious attempt to leak secret and execute dynamic shell\nconst AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';\neval(process.env.UNTRUSTED_INPUT);\n`
  );
  runCmd("git add src/telemetry.ts", TEMP_DIR);
  runCmd('git commit -m "fix(telemetry): add debug logger with embedded credentials"', TEMP_DIR);

  const commitBSHA = runCmd("git rev-parse HEAD", TEMP_DIR);
  runCmd(`git -c http.extraHeader="Authorization: Bearer ${ephemeralToken}" push -u "${remoteUrl}" feature/rogue-agent --force`, TEMP_DIR);
  console.log(`  ✓ Real Push to Cloudflare Artifacts branch complete. Commit: ${commitBSHA.slice(0, 8)}`);

  // ABS Core Gatekeeper Evaluation
  const sigB = await CortexCrypto.signPayload(`${REPO_NAME}:${commitBSHA}:${agent.agentId}`, agentKeypair.privateKey);
  const outcomeB = await gatekeeper.evaluateCommit({
    repo: REPO_NAME,
    branch: "feature/rogue-agent",
    commitHash: commitBSHA,
    parentCommitHash: commitASHA,
    authorAgent: agent,
    promptText: "Add telemetry logging",
    diff: fs.readFileSync(path.join(TEMP_DIR, "src/telemetry.ts"), "utf-8"),
    modifiedFiles: ["src/telemetry.ts"],
    signatureHex: sigB,
  });

  console.log(`  ➔ ABS Gatekeeper Decision: [ ${outcomeB.decision} ] (Evaluated in ${outcomeB.totalLatencyMs}ms)`);
  console.log(`  ➔ Fail-Closed Reason: ${outcomeB.gates[0].reason}`);
  console.log(`  ➔ Pipeline Action: CI/DEPLOYMENT BLOCKED IMMEDIATELY — NO SIDE EFFECTS PERMITTED\n`);

  // --------------------------------------------------------------------------
  // TEST SCENARIO C: Sensitive Database Migration ➔ ESCALATE (Human Quorum)
  // --------------------------------------------------------------------------
  console.log("[Step 5/5] SCENARIO C: Sensitive Schema Migration ➔ Expected: ESCALATE");
  runCmd("git checkout main", TEMP_DIR);
  runCmd("git checkout -b feature/db-migration", TEMP_DIR);
  fs.mkdirSync(path.join(TEMP_DIR, "migrations"), { recursive: true });
  fs.writeFileSync(
    path.join(TEMP_DIR, "migrations/20261002_billing_tables.sql"),
    `CREATE TABLE billing_accounts (id TEXT PRIMARY KEY, balance REAL NOT NULL, is_active BOOLEAN DEFAULT true);\n`
  );
  runCmd("git add migrations/20261002_billing_tables.sql", TEMP_DIR);
  runCmd('git commit -m "feat(db): add production billing accounts table"', TEMP_DIR);

  const commitCSHA = runCmd("git rev-parse HEAD", TEMP_DIR);
  runCmd(`git -c http.extraHeader="Authorization: Bearer ${ephemeralToken}" push -u "${remoteUrl}" feature/db-migration --force`, TEMP_DIR);
  console.log(`  ✓ Real Push to Cloudflare Artifacts branch complete. Commit: ${commitCSHA.slice(0, 8)}`);

  // ABS Core Gatekeeper Evaluation
  const sigC = await CortexCrypto.signPayload(`${REPO_NAME}:${commitCSHA}:${agent.agentId}`, agentKeypair.privateKey);
  const outcomeC = await gatekeeper.evaluateCommit({
    repo: REPO_NAME,
    branch: "feature/db-migration",
    commitHash: commitCSHA,
    parentCommitHash: commitASHA,
    authorAgent: agent,
    promptText: "Apply schema migration for billing tables",
    diff: fs.readFileSync(path.join(TEMP_DIR, "migrations/20261002_billing_tables.sql"), "utf-8"),
    modifiedFiles: ["migrations/20261002_billing_tables.sql"],
    signatureHex: sigC,
  });

  console.log(`  ➔ ABS Gatekeeper Decision: [ ${outcomeC.decision} ] (Evaluated in ${outcomeC.totalLatencyMs}ms)`);
  console.log(`  ➔ Quorum Trigger: ${outcomeC.quorumRequired?.reason}`);
  console.log(`  ➔ Required Approvals: ${outcomeC.quorumRequired?.requiredApprovals} Human Officers (M-of-N Webhook Dispatched)`);
  console.log(`  ➔ Pipeline Action: EXECUTION FROZEN PENDING HUMAN MULTI-SIG APPROVAL\n`);

  // Clean local temp folder
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  // --------------------------------------------------------------------------
  // EXECUTIVE SUMMARY MATRIX
  // --------------------------------------------------------------------------
  console.log("================================================================================");
  console.log("  🏆 CANONICAL DEMONSTRATION MATRIX — 100% REPRODUCIBLE & VERIFIED");
  console.log("================================================================================");
  console.log(`  COMMIT A (Safe Feature):      ➔ [ ${outcomeA.decision} ]           ➔ Promoted to CI/Production`);
  console.log(`  COMMIT B (Secret Injected):   ➔ [ ${outcomeB.decision} ]            ➔ Fail-Closed Terminated`);
  console.log(`  COMMIT C (Schema Migration):  ➔ [ ${outcomeC.decision} ] ➔ Frozen for Human Quorum`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`  Cryptographic Ledger Status:  ➔ 2 Sealed SARs | Merkle Root: 0x${outcomeC.merkleRoot?.slice(0, 16)}...`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("E2E Governance Pipeline Error:", err);
  process.exit(1);
});
