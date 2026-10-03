/**
 * CORTEX Git: deterministic, pattern-based commit policy checks.
 */

import {
  SignedCommitRecord,
  EvaluationOutcome,
  GateResult,
  AgentIdentity,
  GateDecision,
} from "./types.js";
import { CortexCrypto } from "./crypto.js";
import { RevocationRegistry } from "./revocation.js";

export interface CommitPayload {
  repo: string;
  branch: string;
  commitHash: string;
  parentCommitHash: string;
  authorAgent: AgentIdentity;
  promptText: string;
  changedFileContent: string;
  modifiedFiles: string[];
  signatureHex: string;
  revocationRegistry?: RevocationRegistry;
}

export class CortexGatekeeper {
  private ledgerLeaves: string[] = [];
  private signedRecords: SignedCommitRecord[] = [];

  // Heuristic patterns for selected hardcoded-secret formats; this is not a complete secret scanner.
  private secretPatterns: RegExp[] = [
    /(?:api[_-]?key|secret|token|password|bearer|auth)["']?\s*[:=]\s*["']([A-Za-z0-9_\-]{16,})["']/i,
    /ghp_[0-9a-zA-Z]{36}/, // GitHub Personal Access Token
    /sk-[a-zA-Z0-9]{48}/,  // OpenAI secret key
    /AKIA[0-9A-Z]{16}/,    // AWS Access Key
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, // PEM private keys
  ];

  // Heuristic text patterns; these checks do not parse or analyze an AST.
  private dangerousPatterns: RegExp[] = [
    /\beval\s*\(/,
    /\bexec\s*\(/,
    /\bchild_process\b/,
    /\bprocess\.exit\s*\(/,
    /rm\s+-rf\s+[\/~]/,
    /drop\s+database/i,
    /drop\s+table/i,
    /curl\s+.*\|\s*(?:bash|sh)/,
  ];

  /**
   * Executes the full deterministic gate evaluation pipeline
   */
  async evaluateCommit(payload: CommitPayload): Promise<EvaluationOutcome> {
    const totalStart = performance.now();
    const gates: GateResult[] = [];
    let decision: GateDecision = "ALLOW";
    let quorumRequiredInfo: { requiredApprovals: number; collectedApprovals: number; reason: string } | undefined;

    // --- GATE 00: Global Kill-Switch & Agent Key Revocation Check ---
    const g0Start = performance.now();
    let g0Passed = true;
    let g0Reason = "Agent key and repository pass revocation and kill-switch checks.";
    if (payload.revocationRegistry) {
      const revocation = await payload.revocationRegistry.checkRevocation(
        payload.authorAgent.publicKey,
        payload.repo
      );
      if (revocation) {
        g0Passed = false;
        g0Reason = `FAIL-CLOSED: ${revocation.reason}`;
        decision = "DENIED";
      }
    }
    gates.push({
      gateNumber: 0,
      gateName: "REVOCATION_AND_KILLSWITCH",
      passed: g0Passed,
      latencyMs: parseFloat((performance.now() - g0Start).toFixed(3)),
      reason: g0Reason,
      evidenceHash: await CortexCrypto.sha256(payload.authorAgent.publicKey + ":" + payload.repo),
    });

    if (!g0Passed) {
      return {
        decision: "DENIED",
        repo: payload.repo,
        branch: payload.branch,
        commitHash: payload.commitHash,
        totalLatencyMs: parseFloat((performance.now() - totalStart).toFixed(3)),
        gates,
      };
    }

    // --- GATE 01: Secret Scanner (Leak Prevention) ---
    const g1Start = performance.now();
    let g1Passed = true;
    let g1Reason = "No configured hardcoded-secret patterns matched changed-file content.";
    for (const pattern of this.secretPatterns) {
      if (pattern.test(payload.changedFileContent)) {
        g1Passed = false;
        g1Reason = "Potential hardcoded secret or API credential pattern detected in changed-file content.";
        decision = "DENIED";
        break;
      }
    }
    gates.push({
      gateNumber: 1,
      gateName: "SECRET_SCANNER",
      passed: g1Passed,
      latencyMs: parseFloat((performance.now() - g1Start).toFixed(3)),
      reason: g1Reason,
      evidenceHash: await CortexCrypto.sha256(payload.changedFileContent.slice(0, 100)),
    });

    // --- GATE 02: Pattern-based dangerous-code check ---
    const g2Start = performance.now();
    let g2Passed = true;
    let g2Reason = "No configured dangerous-code text patterns matched changed-file content.";
    if (g1Passed) {
      for (const pattern of this.dangerousPatterns) {
        if (pattern.test(payload.changedFileContent)) {
          g2Passed = false;
          g2Reason = "FAIL-CLOSED: Dangerous execution pattern (eval/exec/rm/drop) identified.";
          decision = "DENIED";
          break;
        }
      }
    } else {
      g2Passed = false;
      g2Reason = "Skipped due to prior failure.";
    }
    gates.push({
      gateNumber: 2,
      gateName: "DANGEROUS_CODE_PATTERN_CHECK",
      passed: g2Passed,
      latencyMs: parseFloat((performance.now() - g2Start).toFixed(3)),
      reason: g2Reason,
      evidenceHash: await CortexCrypto.sha256(g2Reason),
    });

    // --- GATE 03: Ed25519 agent-attestation verification ---
    const g3Start = performance.now();
    let g3Passed = false;
    let g3Reason = "Invalid or unverified agent signature.";
    const signedData = CortexCrypto.agentAttestationPayload(
      payload.repo, payload.branch, payload.commitHash, payload.authorAgent.agentId
    );
    if (payload.signatureHex) {
      g3Passed = await CortexCrypto.verifySignature(
        signedData,
        payload.signatureHex,
        payload.authorAgent.publicKey
      );
      if (g3Passed) {
        g3Reason = "Ed25519 signature cryptographically verified against agent public key.";
      } else {
        decision = "DENIED";
        g3Reason = "FAIL-CLOSED: Agent attestation signature verification failed.";
      }
    } else {
      decision = "DENIED";
      g3Reason = "Missing agent signature.";
    }
    gates.push({
      gateNumber: 3,
      gateName: "CRYPTOGRAPHIC_ATTESTATION",
      passed: g3Passed,
      latencyMs: parseFloat((performance.now() - g3Start).toFixed(3)),
      reason: g3Reason,
      evidenceHash: await CortexCrypto.sha256(payload.signatureHex || "NONE"),
    });

    // --- GATE 04: Human Quorum Gate for Critical Paths ---
    const g4Start = performance.now();
    let g4Passed = true;
    let g4Reason = "No elevated paths affected. Autonomous merge allowed.";
    const criticalPatterns = [/^wrangler\.toml$/, /^migrations\//, /^\.github\//];
    const touchesCritical = payload.modifiedFiles.some((f) =>
      criticalPatterns.some((p) => p.test(f))
    );

    if (touchesCritical && decision === "ALLOW") {
      decision = "QUORUM_REQUIRED";
      g4Passed = false;
      g4Reason = "Human Quorum Required: Modification touches infrastructure or schema migrations.";
      quorumRequiredInfo = {
        requiredApprovals: 2,
        collectedApprovals: 0,
        reason: "Touches critical configuration or database migration files.",
      };
    }
    gates.push({
      gateNumber: 4,
      gateName: "HUMAN_QUORUM_GATE",
      passed: g4Passed,
      latencyMs: parseFloat((performance.now() - g4Start).toFixed(3)),
      reason: g4Reason,
      evidenceHash: await CortexCrypto.sha256(g4Reason),
    });

    // --- GATE 05: Per-evaluation Merkle record and local hash-based timestamp ---
    const g5Start = performance.now();
    let signedRecord: SignedCommitRecord | undefined;
    let merkleRoot: string | undefined;

    if (decision !== "DENIED") {
      const promptHash = await CortexCrypto.sha256(payload.promptText);
      const timestamp = await CortexCrypto.issueLocalTimestampProof(payload.commitHash);
      const sarId = `SAR-${crypto.randomUUID().slice(0, 12)}`;

      const leafContent = `${payload.commitHash}:${payload.authorAgent.agentId}:${timestamp.proof}`;
      const merkleLeaf = await CortexCrypto.sha256(leafContent);

      this.ledgerLeaves.push(merkleLeaf);

      const tree = await CortexCrypto.buildMerkleTree(this.ledgerLeaves);
      merkleRoot = tree.hash;

      signedRecord = {
        commitHash: payload.commitHash,
        repo: payload.repo,
        branch: payload.branch,
        authorAgentId: payload.authorAgent.agentId,
        promptHash,
        parentCommitHash: payload.parentCommitHash,
        observedAt: timestamp.observedAt,
        localTimestampProof: timestamp.proof,
        monotonicClockMs: timestamp.monotonicClockMs,
        signature: payload.signatureHex,
        sarId,
        merkleLeaf,
      };

      this.signedRecords.push(signedRecord);
    }

    gates.push({
      gateNumber: 5,
      gateName: "MERKLE_AUDIT_RECORD",
      passed: decision !== "DENIED",
      latencyMs: parseFloat((performance.now() - g5Start).toFixed(3)),
      reason: decision !== "DENIED" ? "Local timestamp hash and per-evaluation Merkle record created; neither is an external timestamp or durable aggregate ledger." : "Skipped due to denial.",
      evidenceHash: merkleRoot || "DENIED",
    });

    const totalLatencyMs = parseFloat((performance.now() - totalStart).toFixed(3));

    return {
      decision,
      repo: payload.repo,
      branch: payload.branch,
      commitHash: payload.commitHash,
      totalLatencyMs,
      gates,
      quorumRequired: quorumRequiredInfo,
      merkleRoot,
      signedRecord,
    };
  }

  getLedgerCount(): number {
    return this.signedRecords.length;
  }

  getRecentRecords(): SignedCommitRecord[] {
    return [...this.signedRecords].reverse().slice(0, 10);
  }
}
