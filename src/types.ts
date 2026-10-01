/**
 * CORTEX Git: Type Definitions for Autonomous Agentic Git Infrastructure
 * Built for Cloudflare Workers & Cloudflare Artifacts
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
  rfc3161Timestamp: string;
  monotonicClockMs: number;
  signature: string; // Ed25519 signature
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
 * Cloudflare Artifacts API Bindings Interface (env.ARTIFACTS)
 */
export interface ArtifactsRepoInfo {
  name: string;
  defaultBranch: string;
  sizeBytes: number;
  jurisdiction: "us" | "eu";
}

export interface ArtifactsWorkspace {
  name: string;
  remote: string;
  token: string;
  parentRepo: string;
}

export interface ArtifactsRepo {
  info(): Promise<ArtifactsRepoInfo>;
  fork(newRepoName: string): Promise<ArtifactsWorkspace>;
  readFile(opts: { ref: string; path: string }): Promise<{ text(): Promise<string> } | null>;
  writeFile(opts: { ref: string; path: string; content: string; message: string }): Promise<{ commitHash: string }>;
  listBranches(): Promise<string[]>;
  createBranch(branch: string, fromRef: string): Promise<void>;
  merge(opts: { sourceRef: string; targetRef: string; message: string }): Promise<{ mergedCommit: string }>;
}

export interface ArtifactsNamespaceBinding {
  get(repoName: string): Promise<ArtifactsRepo>;
  create(repoName: string, opts?: { defaultBranch?: string; jurisdiction?: "us" | "eu" }): Promise<ArtifactsRepo>;
}

export interface CloudflareEnv {
  ARTIFACTS: ArtifactsNamespaceBinding;
  DB?: D1Database;
  ENVIRONMENT?: string;
  PLATFORM_NAME?: string;
  SECURITY_LEVEL?: string;
  JURISDICTION?: string;
}
