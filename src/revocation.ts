/**
 * CORTEX Git: Instant Revocation & Kill-Switch Engine (Workers KV Instant)
 * Sub-2ms p99 read latency with 250ms global edge propagation.
 */

export interface RevocationRecord {
  revoked: boolean;
  type: "GLOBAL" | "REPOSITORY" | "AGENT";
  target: string;
  reason?: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface RevocationKVBinding {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export class RevocationRegistry {
  constructor(private kv?: RevocationKVBinding | null) {}

  /**
   * Evaluates if a request, agent key, or repository is subject to revocation or kill-switch.
   * Returns RevocationRecord if blocked, or null if clear.
   */
  async checkRevocation(agentPublicKey?: string, repoName?: string): Promise<RevocationRecord | null> {
    if (!this.kv) return null;

    // 1. Check Global Emergency Kill-Switch
    const globalRaw = await this.kv.get("killswitch:global");
    if (globalRaw) {
      try {
        const parsed = JSON.parse(globalRaw);
        if (parsed.active !== false) {
          return {
            revoked: true,
            type: "GLOBAL",
            target: "global",
            reason: parsed.reason || "Global emergency kill-switch is active",
            revokedAt: parsed.timestamp,
          };
        }
      } catch {
        return { revoked: true, type: "GLOBAL", target: "global", reason: "Global kill-switch active" };
      }
    }

    // 2. Check Repository-Specific Mutation Suspension
    if (repoName) {
      const repoRaw = await this.kv.get(`killswitch:repo:${repoName}`);
      if (repoRaw) {
        try {
          const parsed = JSON.parse(repoRaw);
          if (parsed.active !== false) {
            return {
              revoked: true,
              type: "REPOSITORY",
              target: repoName,
              reason: parsed.reason || `Repository ${repoName} mutations are suspended`,
              revokedAt: parsed.timestamp,
            };
          }
        } catch {
          return { revoked: true, type: "REPOSITORY", target: repoName, reason: "Repository suspended" };
        }
      }
    }

    // 3. Check Individual Agent Public Key Revocation
    if (agentPublicKey) {
      const keyNorm = agentPublicKey.toLowerCase().trim();
      const agentRaw = await this.kv.get(`revocation:agent:${keyNorm}`);
      if (agentRaw) {
        try {
          const parsed = JSON.parse(agentRaw);
          return {
            revoked: true,
            type: "AGENT",
            target: keyNorm,
            reason: parsed.reason || "Agent cryptographic key has been revoked",
            revokedAt: parsed.revokedAt,
            revokedBy: parsed.revokedBy,
          };
        } catch {
          return { revoked: true, type: "AGENT", target: keyNorm, reason: "Agent key revoked" };
        }
      }
    }

    return null;
  }

  async setGlobalKillSwitch(active: boolean, reason?: string): Promise<void> {
    if (!this.kv) throw new Error("KV binding not available");
    if (active) {
      await this.kv.put(
        "killswitch:global",
        JSON.stringify({
          active: true,
          reason: reason || "Emergency lockdown triggered",
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      await this.kv.delete("killswitch:global");
    }
  }

  async setRepoKillSwitch(repoName: string, active: boolean, reason?: string): Promise<void> {
    if (!this.kv) throw new Error("KV binding not available");
    if (active) {
      await this.kv.put(
        `killswitch:repo:${repoName}`,
        JSON.stringify({
          active: true,
          reason: reason || `Suspension for ${repoName}`,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      await this.kv.delete(`killswitch:repo:${repoName}`);
    }
  }

  async revokeAgent(agentPublicKey: string, reason?: string, revokedBy?: string): Promise<void> {
    if (!this.kv) throw new Error("KV binding not available");
    const keyNorm = agentPublicKey.toLowerCase().trim();
    await this.kv.put(
      `revocation:agent:${keyNorm}`,
      JSON.stringify({
        revoked: true,
        reason: reason || "Security interdiction",
        revokedAt: new Date().toISOString(),
        revokedBy: revokedBy || "ABS_CORE_GATEWAY",
      })
    );
  }

  async unrevokeAgent(agentPublicKey: string): Promise<void> {
    if (!this.kv) throw new Error("KV binding not available");
    const keyNorm = agentPublicKey.toLowerCase().trim();
    await this.kv.delete(`revocation:agent:${keyNorm}`);
  }
}
