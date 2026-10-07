/**
 * CORTEX Git: Type Definitions for Autonomous Agentic Git Infrastructure
 * Strictly aligned with official Cloudflare Artifacts & Workers Specs (Oct 2026)
 */

export interface AgentIdentity {
  agentId: string;
  name: string;
  model: string;
  publicKey: string; // Ed25519 public key hex
  trustTier: "RESTRICTED" | "STANDARD" | "CORE_OPERATOR";
  createdTimestamp: number;
}

export interface TaskIntent {
  taskId: string;
  agentId: string;
  repo: string;
  description: string;
  targetFiles: string[];
  expectedModifications: string[];
  safetyConstraints: string[];
  timestamp: number;
}

export interface SignedCommitRecord {
  commitHash: string;
  repo: string;
  branch: string;
  authorAgentId: string;
  promptHash: string;
  parentCommitHash: string;
  observedAt: string;
  localTimestampProof: string;
  monotonicClockMs: number;
  signature: string; // Agent signature over repository, ref, commit SHA, and agent ID
  sarId: string; // Signed Action Record ID
  merkleLeaf: string;
}

export type GateDecision = "ALLOW" | "QUORUM_REQUIRED" | "DENIED";

export interface GateResult {
  gateNumber: number;
  gateName: string;
  passed: boolean;
  latencyMs: number;
  reason: string;
  evidenceHash: string;
}

export interface EvaluationOutcome {
  decision: GateDecision;
  repo: string;
  branch: string;
  commitHash: string;
  totalLatencyMs: number;
  gates: GateResult[];
  quorumRequired?: {
    requiredApprovals: number;
    collectedApprovals: number;
    reason: string;
  };
  merkleRoot?: string;
  signedRecord?: SignedCommitRecord;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export interface SPVInclusionProof {
  leaf: string;
  leafIndex: number;
  auditPath: { position: "left" | "right"; hash: string }[];
  merkleRoot: string;
}

/**
 * Official Cloudflare Artifacts RPC Capability & Binding Interfaces
 * (Derived from Cloudflare Artifacts Workers Binding API Specs)
 */
export type CloudflareEnv = Env;

export interface ArtifactsPushEvent {
  type: "cf.artifacts.repo.pushed";
  source: { type?: "artifacts.repo"; namespace: string; repoName: string };
  payload: {
    ref: string;
    before: string;
    after: string;
    commits: Array<{ id: string; message: string; parents: string[] }>;
    totalCommitsCount: number;
    commitsTruncated: boolean;
  };
  metadata?: {
    accountId?: string;
    eventSubscriptionId?: string;
    eventSchemaVersion?: number;
    eventTimestamp?: string;
  };
}
