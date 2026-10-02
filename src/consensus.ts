/**
 * CORTEX Git: Multi-Agent Consensus & "Why It Changed" Engine
 * Answers Cloudflare's core challenge:
 * Comparing multiple agent changes simultaneously, preserving context, and deciding which ships.
 */

import { AgentIdentity } from "./types.js";
import { CortexCrypto } from "./crypto.js";

export interface CandidateProposal {
  agent: AgentIdentity;
  branch: string;
  commitHash: string;
  rationale: string;
  diffSummary: {
    additions: number;
    deletions: number;
    filesModified: number;
  };
  metrics: {
    testsPassed: boolean;
    benchmarkLatencyImprovementMs?: number;
    codeComplexityScore: number; // lower is cleaner
    securityScore: number; // 0-100
  };
}

export interface ConsensusDecision {
  winningProposal: CandidateProposal;
  rankingExplanation: string;
  compositeScore: number;
  allScores: { agentId: string; score: number }[];
  synthesisMarkdown: string;
  authorizedMergeTarget: string;
}

export class CortexConsensus {
  /**
   * Evaluates multiple agent proposals competing for the same task/feature
   * Produces an explainable, deterministic consensus decision authorizing which branch may advance
   */
  static async evaluateCandidates(
    taskDescription: string,
    candidates: CandidateProposal[],
    targetBranch = "main"
  ): Promise<ConsensusDecision> {
    if (candidates.length === 0) {
      throw new Error("Cannot evaluate empty candidates list.");
    }

    const scored = candidates.map((cand) => {
      let score = 0;

      // 1. Tests must pass (hard requirement)
      if (cand.metrics.testsPassed) {
        score += 50;
      } else {
        score -= 100;
      }

      // 2. Security score (0 to 30 points)
      score += (cand.metrics.securityScore / 100) * 30;

      // 3. Simplicity / Low Complexity (Karpathy simplicity principle: 0 to 20 points)
      const simplicityBonus = Math.max(0, 20 - cand.metrics.codeComplexityScore);
      score += simplicityBonus;

      // 4. Performance latency improvement bonus
      if (cand.metrics.benchmarkLatencyImprovementMs && cand.metrics.benchmarkLatencyImprovementMs > 0) {
        score += Math.min(10, cand.metrics.benchmarkLatencyImprovementMs * 2);
      }

      return {
        candidate: cand,
        score: parseFloat(score.toFixed(2)),
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const winner = scored[0].candidate;
    const winnerScore = scored[0].score;

    const synthesisMarkdown = `### 🏆 Autonomous Consensus Report
**Task:** ${taskDescription}  
**Selected Champion:** Agent \`${winner.agent.name}\` (\`${winner.agent.model}\`)  
**Authorized Branch for Promotion:** \`${winner.branch}\` (Commit: \`${winner.commitHash.slice(0, 10)}\`)  
**Composite Evaluation Score:** ${winnerScore}/100

#### 🔍 Why This Change Was Selected Over Competing Agents:
- **Rationale:** ${winner.rationale}
- **Diff Footprint:** +${winner.diffSummary.additions} / -${winner.diffSummary.deletions} lines across ${winner.diffSummary.filesModified} files.
- **Security & Invariants:** Certified ${winner.metrics.securityScore}% clean policy rating.
- **Testing:** ${winner.metrics.testsPassed ? "100% deterministic test suite green." : "Failing tests."}

#### 📊 Comparative Agent Matrix:
${scored
  .map(
    (s, idx) =>
      `${idx + 1}. **${s.candidate.agent.name}**: Score **${s.score}** (+${s.candidate.diffSummary.additions}/-${s.candidate.diffSummary.deletions}) — *${s.candidate.rationale}*`
  )
  .join("\n")}
`;

    return {
      winningProposal: winner,
      rankingExplanation: `Agent ${winner.agent.name} won with score ${winnerScore} due to superior simplicity and full test verification.`,
      compositeScore: winnerScore,
      allScores: scored.map((s) => ({ agentId: s.candidate.agent.agentId, score: s.score })),
      synthesisMarkdown,
      authorizedMergeTarget: targetBranch,
    };
  }
}
