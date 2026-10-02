import { TaskIntent } from "./types.js";

export interface TriageResult {
  taskId: string;
  allowedConcurrently: true;
  assignedWorkspace: string;
  conflictRisk: "LOW";
  overlappingFiles: [];
  requiresQuorum: boolean;
  arbiterLatencyMs: number;
  workspace: { name: string; remote: string; token: string; tokenId: string; tokenExpiresAt: string };
}

/** Creates isolated Artifacts workspaces; Git-level conflict detection happens after pushes. */
export class CortexArbiter {
  private protectedPaths: RegExp[] = [
    /^wrangler\.toml$/,
    /^package\.json$/,
    /^migrations\//,
    /^\.github\/workflows\//,
    /^SECURITY\.md$/,
    /^contracts\//,
  ];

  constructor(private artifacts: Artifacts) {}

  async triageIntent(intent: TaskIntent): Promise<TriageResult> {
    const start = performance.now();
    const requiresQuorum = intent.targetFiles.some((file) =>
      this.protectedPaths.some((pattern) => pattern.test(file))
    );
    const forkId = `agent-${intent.agentId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
    const baseRepo = await this.artifacts.get(intent.repo);
    const workspace = await baseRepo.fork(forkId, { defaultBranchOnly: true, readOnly: false });

    const scopedToken = await (await this.artifacts.get(workspace.name)).createToken("write", 1800);
    await (await this.artifacts.get(workspace.name)).revokeToken(workspace.token);
    return {
      taskId: intent.taskId,
      allowedConcurrently: true,
      assignedWorkspace: workspace.name,
      conflictRisk: "LOW",
      overlappingFiles: [],
      requiresQuorum,
      arbiterLatencyMs: parseFloat((performance.now() - start).toFixed(3)),
      workspace: {
        name: workspace.name,
        remote: workspace.remote,
        token: scopedToken.plaintext,
        tokenId: scopedToken.id,
        tokenExpiresAt: scopedToken.expiresAt,
      },
    };
  }
}
