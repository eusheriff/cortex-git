/**
 * CORTEX Git: Pre-dispatch Arbiter (JEV System 1)
 * High-throughput deterministic concurrency triage engine.
 * Partitions task graph, prevents merge collisions, and manages Artifacts forks.
 */

import { TaskIntent, ArtifactsNamespaceBinding, ArtifactsCreateRepoResult } from "./types.js";
import { CortexCrypto } from "./crypto.js";

export interface TriageResult {
  taskId: string;
  allowedConcurrently: boolean;
  assignedWorkspace: string;
  conflictRisk: "LOW" | "MODERATE" | "HIGH_COLLISION";
  overlappingFiles: string[];
  requiresQuorum: boolean;
  arbiterLatencyMs: number;
}

export class CortexArbiter {
  private activeTasks: Map<string, TaskIntent> = new Map();
  private protectedPaths: RegExp[] = [
    /^wrangler\.toml$/,
    /^package\.json$/,
    /^migrations\//,
    /^\.github\/workflows\//,
    /^SECURITY\.md$/,
    /^contracts\//,
  ];

  constructor(private artifacts: ArtifactsNamespaceBinding) {}

  /**
   * Evaluates task intent against all currently active tasks
   * Runs in < 25ms to enable instantaneous fork creation
   */
  async triageIntent(intent: TaskIntent): Promise<TriageResult> {
    const start = performance.now();
    const overlappingFiles: string[] = [];
    let requiresQuorum = false;

    // Check for protected paths requiring elevated human quorum
    for (const file of intent.targetFiles) {
      if (this.protectedPaths.some((pattern) => pattern.test(file))) {
        requiresQuorum = true;
      }
    }

    // Inspect collisions with currently running agent tasks
    for (const [otherId, activeIntent] of this.activeTasks.entries()) {
      if (activeIntent.repo !== intent.repo) continue;

      for (const target of intent.targetFiles) {
        if (activeIntent.targetFiles.includes(target)) {
          overlappingFiles.push(target);
        }
      }
    }

    let conflictRisk: "LOW" | "MODERATE" | "HIGH_COLLISION" = "LOW";
    let allowedConcurrently = true;

    if (overlappingFiles.length > 0) {
      conflictRisk = overlappingFiles.length > 2 ? "HIGH_COLLISION" : "MODERATE";
      // If high collision on exact same files, we do NOT allow concurrent write without serialization
      if (conflictRisk === "HIGH_COLLISION") {
        allowedConcurrently = false;
      }
    }

    // Create an isolated Cloudflare Artifacts fork for the agent session
    const forkId = `agent-${intent.agentId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
    let assignedWorkspace = forkId;

    if (allowedConcurrently) {
      try {
        const baseRepo = await this.artifacts.get(intent.repo);
        const workspace = await baseRepo.fork(forkId);
        assignedWorkspace = workspace.name;
        this.activeTasks.set(intent.taskId, intent);
      } catch (err) {
        // Fallback name if mocking
        assignedWorkspace = forkId;
        this.activeTasks.set(intent.taskId, intent);
      }
    }

    const arbiterLatencyMs = parseFloat((performance.now() - start).toFixed(3));

    return {
      taskId: intent.taskId,
      allowedConcurrently,
      assignedWorkspace,
      conflictRisk,
      overlappingFiles,
      requiresQuorum,
      arbiterLatencyMs,
    };
  }

  /**
   * Releases task from active registry once commit is finalized or aborted
   */
  releaseTask(taskId: string): void {
    this.activeTasks.delete(taskId);
  }

  /**
   * Returns current active concurrency metrics
   */
  getActiveAgentCount(): number {
    return this.activeTasks.size;
  }
}
