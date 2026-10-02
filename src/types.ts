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
 * Official Cloudflare Artifacts RPC Capability & Binding Interfaces
 * (Derived from Cloudflare Artifacts Workers Binding API Specs)
 */
export interface ArtifactsCreateRepoResult {
  name: string;
  remote: string;
  defaultBranch?: string;
  token?: string;
}

export interface ArtifactsRepoInfo {
  name: string;
  defaultBranch: string;
  sizeBytes?: number;
  readOnly?: boolean;
  createdAt?: string;
}

export interface ArtifactsTokenResult {
  id: string;
  token: string;
  expiresAt?: string;
  scope?: string;
}

export interface ArtifactsCommitMetadata {
  hash: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  parents: string[];
}

export interface ArtifactsTreeEntry {
  path: string;
  type: "blob" | "tree";
  hash: string;
}

export interface ArtifactsRepo {
  info(): Promise<ArtifactsRepoInfo>;
  createToken(scope?: "read" | "write" | "admin", ttl?: number): Promise<ArtifactsTokenResult>;
  listTokens(): Promise<ArtifactsTokenResult[]>;
  revokeToken(tokenOrId: string): Promise<boolean>;
  fork(
    name: string,
    opts?: { description?: string; readOnly?: boolean; defaultBranchOnly?: boolean }
  ): Promise<ArtifactsCreateRepoResult>;
  log(opts?: { ref?: string; limit?: number; offset?: number }): Promise<ArtifactsCommitMetadata[]>;
  readCommit(hash: string): Promise<ArtifactsCommitMetadata | null>;
  readTree(hash: string): Promise<ArtifactsTreeEntry[] | null>;
  readBlob(hash: string): Promise<Blob | null>;
  readFile(args: { ref: string; path: string }): Promise<Blob | null>;
}

export interface ArtifactsNamespaceBinding {
  create(
    name: string,
    opts?: { description?: string; readOnly?: boolean; setDefaultBranch?: string }
  ): Promise<ArtifactsCreateRepoResult>;
  get(name: string): Promise<ArtifactsRepo>;
  list(opts?: { limit?: number; cursor?: string }): Promise<{
    repos: { name: string; status: "ready" | "importing" | "forking" }[];
    cursor?: string;
  }>;
  delete(name: string): Promise<void>;
}

export interface CloudflareEnv {
  ARTIFACTS: ArtifactsNamespaceBinding;
  DB?: D1Database;
  ENVIRONMENT?: string;
  PLATFORM_NAME?: string;
  SECURITY_LEVEL?: string;
  JURISDICTION?: string;
}
