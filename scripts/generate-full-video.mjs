import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const workDir = "/Users/isheriffgomes/Downloads/cortex-git-video-production/full-production";
mkdirSync(workDir, { recursive: true });

const chromeBin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const scenes = [
  {
    id: "scene_01",
    label: "01 / 10 • THE PROBLEM",
    title: "The Agentic Software Challenge",
    subtitle: "Why Autonomous Code Generation Breaks Traditional Git Governance",
    badge: "FOUNDATIONAL PROBLEM",
    badgeColor: "#F43F5E",
    speech: "AI coding agents can generate and push changes exponentially faster than human engineering teams can review them. As swarms of autonomous agents scale across production repositories, the core challenge is no longer merely generating a diff. The challenge is verifying exactly what was pushed, evaluating the actual repository evidence without trusting caller metadata, and deciding whether that change is authorized to move forward. Many concurrent agents. One shared codebase. At every stage, a critical question arises: who—or what—authorizes promotion? CORTEX Git connects real repository events directly to deterministic, fail-closed runtime governance, ensuring that a successful git push is never automatically treated as permission to ship.",
    cardHtml: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px;">
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 16px; padding: 32px;">
          <h3 style="color: #F43F5E; font-size: 24px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
            <span>❌</span> Traditional Git Failure
          </h3>
          <ul style="color: #94A3B8; font-size: 20px; line-height: 1.8; list-style: none;">
            <li>• Humans drown in hundreds of LLM pull requests</li>
            <li>• Untrusted author metadata (git config user.name)</li>
            <li>• Branch collisions & manual merge conflict chaos</li>
            <li>• Push-to-main directly triggers CI without runtime firewall</li>
            <li>• Zero mathematical proof of prompt or decision provenance</li>
          </ul>
        </div>
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 32px;">
          <h3 style="color: #10B981; font-size: 24px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
            <span>🛡️</span> CORTEX Git Solution
          </h3>
          <ul style="color: #CBD5E1; font-size: 20px; line-height: 1.8; list-style: none;">
            <li>• Sub-millisecond pre-dispatch triage (0.05ms P50)</li>
            <li>• Isolated Artifacts workspaces with ephemeral tokens</li>
            <li>• Fail-Closed 11-Gate Gatekeeper evaluating real commits</li>
            <li>• Cryptographic Ed25519 & WORM Merkle inclusion proofs</li>
            <li>• Distinct M-of-N human quorum only for sensitive mutations</li>
          </ul>
        </div>
      </div>
      <div style="margin-top: 32px; text-align: center; padding: 20px; background: rgba(56, 189, 248, 0.08); border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2);">
        <span style="font-size: 22px; color: #38BDF8; font-weight: 600;">"Agents can write the code. ABS Core decides whether the change is allowed to proceed."</span>
      </div>
    `
  },
  {
    id: "scene_02",
    label: "02 / 10 • ARCHITECTURE",
    title: "Clean Separation of Concerns",
    subtitle: "Cloudflare Development Platform + CORTEX Orchestration + ABS Core Gatekeeper",
    badge: "SYSTEM TOPOLOGY",
    badgeColor: "#38BDF8",
    speech: "Rather than rebuilding Git or transforming the governance core into another Git server, CORTEX Git establishes a clean, mathematically sound separation of concerns. Cloudflare Artifacts controls the development environment, managing repositories, isolated forks, workspaces, and ephemeral write tokens over standard Git protocol. The agents produce code and push real commits. CORTEX coordinates task dispatching, sub-millisecond AST conflict triage, and multi-agent synthesis. Finally, the ABS Core Gatekeeper intercepts the push event and authoritatively evaluates the commit against an 11-gate fail-closed pipeline. Cloudflare gives agents a place to build. CORTEX coordinates the work. ABS Core governs what is allowed to ship.",
    cardHtml: `
      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 16px; padding: 32px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
          <div style="flex: 1; background: rgba(30, 41, 59, 0.6); padding: 20px; border-radius: 12px; border-left: 4px solid #F59E0B; text-align: center;">
            <div style="font-size: 14px; color: #F59E0B; font-weight: 700; text-transform: uppercase;">1. Orchestration</div>
            <div style="font-size: 22px; color: #F8FAFC; font-weight: 700; margin: 8px 0;">CORTEX Engine</div>
            <div style="font-size: 14px; color: #94A3B8;">Task Dispatch & AST Conflict Triage</div>
          </div>
          <div style="color: #64748B; font-size: 28px;">➔</div>
          <div style="flex: 1; background: rgba(30, 41, 59, 0.6); padding: 20px; border-radius: 12px; border-left: 4px solid #F38020; text-align: center;">
            <div style="font-size: 14px; color: #F38020; font-weight: 700; text-transform: uppercase;">2. Development & Isolation</div>
            <div style="font-size: 22px; color: #F8FAFC; font-weight: 700; margin: 8px 0;">Cloudflare Artifacts</div>
            <div style="font-size: 14px; color: #94A3B8;">Repos, Workspaces & Ephemeral Tokens</div>
          </div>
          <div style="color: #64748B; font-size: 28px;">➔</div>
          <div style="flex: 1; background: rgba(30, 41, 59, 0.6); padding: 20px; border-radius: 12px; border-left: 4px solid #38BDF8; text-align: center;">
            <div style="font-size: 14px; color: #38BDF8; font-weight: 700; text-transform: uppercase;">3. Actuation Authority</div>
            <div style="font-size: 22px; color: #F8FAFC; font-weight: 700; margin: 8px 0;">ABS Gatekeeper</div>
            <div style="font-size: 14px; color: #94A3B8;">Fail-Closed 11-Gate Pipeline</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 24px;">
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 20px; color: #10B981; font-weight: 800;">ALLOW</div>
            <div style="font-size: 14px; color: #94A3B8; margin-top: 4px;">Authorized for CI / Deploy</div>
          </div>
          <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 20px; color: #F43F5E; font-weight: 800;">DENIED</div>
            <div style="font-size: 14px; color: #94A3B8; margin-top: 4px;">Terminated Fail-Closed</div>
          </div>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 20px; color: #F59E0B; font-weight: 800;">ESCALATE</div>
            <div style="font-size: 14px; color: #94A3B8; margin-top: 4px;">Frozen for Human Quorum</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "scene_03",
    label: "03 / 10 • OPEN SOURCE & PREREQUISITES",
    title: "Repository & Zero-Trust Foundation",
    subtitle: "Apache-2.0 License • Author: Rodrigo Gomes (OConnector Technology)",
    badge: "SPECIFICATION",
    badgeColor: "#818CF8",
    speech: "The platform is completely open source under the permissive Apache 2.0 license, authored by Rodrigo Gomes at OConnector Technology. The repository documents the complete reproduction lifecycle: configuring an isolated Cloudflare test namespace, applying D1 database migrations, provisioning the control key secret, deploying the edge worker and event workflow, and running the live verification suite. In this demonstration, all executions operate inside an isolated test namespace and an EU-jurisdiction D1 database, completely segregated from production infrastructure.",
    cardHtml: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(129, 140, 248, 0.3); border-radius: 16px; padding: 24px;">
          <div style="font-size: 16px; color: #818CF8; font-weight: 700; text-transform: uppercase;">Repository & Metadata</div>
          <table style="width: 100%; margin-top: 16px; font-size: 16px; color: #CBD5E1; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">Repository</td><td style="font-family: monospace; color: #38BDF8;">eusheriff/cortex-git</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">License</td><td>Apache-2.0</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">Author</td><td>Rodrigo Gomes (OConnector Technology)</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">Platform</td><td>Cloudflare Workers & Artifacts (Open Beta)</td></tr>
            <tr><td style="padding: 10px 0; color: #64748B;">D1 Database</td><td>cortex-git-governance (EU Jurisdiction)</td></tr>
          </table>
        </div>
        <div style="background: #0F172A; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; font-family: monospace;">
          <div style="color: #64748B; font-size: 14px; margin-bottom: 12px;"># Reproduction Runbook</div>
          <div style="color: #38BDF8; font-size: 16px; line-height: 1.8;">
            <div>$ npm run build <span style="color: #10B981;"># 0 TypeScript errors</span></div>
            <div>$ npm test <span style="color: #10B981;"># 8/8 tests pass in 250ms</span></div>
            <div>$ wrangler d1 migrations apply DB --remote</div>
            <div>$ wrangler deploy <span style="color: #10B981;"># Deploys Worker + Workflow</span></div>
            <div style="color: #F59E0B; margin-top: 8px;">$ npm run demo:e2e <span style="color: #CBD5E1;"># Real Cloudflare Live E2E</span></div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "scene_04",
    label: "04 / 10 • SCENARIO A: SAFE CODE CHANGE",
    title: "Safe Feature: Instant Evaluation & Promotion",
    subtitle: "Real Git Push Over HTTPS ➔ ABS Gatekeeper ➔ ALLOW ➔ AUTHORIZED",
    badge: "EVALUATION: ALLOW",
    badgeColor: "#10B981",
    speech: "Now let us examine the first live scenario: a safe, valid feature implementation. An autonomous agent receives a task and an isolated Artifacts workspace. The agent authors the code change and performs a real git push over HTTPS using its ephemeral write token. Cloudflare Artifacts receives the commit and fires the push event to our Governance Workflow. The edge Worker retrieves the commit, tree, and file blobs directly from Cloudflare Artifacts. The ABS Gatekeeper evaluates the evidence through all 11 gates in under 11 milliseconds, issuing an ALLOW decision. The persistent promotion state transitions to AUTHORIZED, making the change eligible for downstream CI and deployment.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(16, 185, 129, 0.1);">
        <div style="color: #10B981; font-weight: 700; margin-bottom: 8px;">[Scenario A] Safe Agent Code Mutation Execution</div>
        <div style="color: #64748B;">• Target: src/safe.ts | Commit: 714d9f6c95f1... | Agent: agent-cortex-safe</div>
        <div style="color: #38BDF8; margin-top: 8px;">$ git push origin HEAD  ➔  https://e7198...artifacts.cloudflare.net/git/...</div>
        <div style="color: #E2E8F0; margin-top: 8px;">✓ Cloudflare Event: cf.artifacts.repo.pushed (Delivered to Workflow)</div>
        <div style="color: #E2E8F0;">✓ Artifacts Content Retrieval: Commit + Tree + Blobs fetched securely</div>
        <div style="color: #E2E8F0;">✓ ABS 11-Gate Evaluation Completed in <span style="color: #10B981; font-weight: 700;">10.9ms</span></div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.15); border-radius: 8px; border: 1px solid #10B981; display: flex; justify-content: space-between;">
          <span style="color: #10B981; font-weight: 800;">DECISION: ALLOW</span>
          <span style="color: #F8FAFC;">PROMOTION STATE: <b style="color: #10B981;">AUTHORIZED</b></span>
          <span style="color: #94A3B8;">Ledger: WORM Merkle Sealed</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_05",
    label: "05 / 10 • SCENARIO B: ROGUE INFILTRATION",
    title: "Secret Injection Interdicted: Fail-Closed",
    subtitle: "Synthetic Credential Detected in Diff ➔ Gate 01 Triggered ➔ DENIED ➔ BLOCKED",
    badge: "EVALUATION: DENIED",
    badgeColor: "#EF4444",
    speech: "In the second scenario, we demonstrate fail-closed protection against an adversarial or hallucinated agent attempting to commit an unauthorized API credential. The agent attempts to push code containing a synthetic secret. Even though the agent holds valid Git push credentials to its branch, the ABS Gatekeeper inspects the authoritative commit diff retrieved from Cloudflare Artifacts. Gate 01 immediately triggers a fail-closed interdiction in less than 1 millisecond. The decision is DENIED, and the promotion state is permanently marked as BLOCKED. The rogue commit is completely neutralized, with zero side effects permitted.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(239, 68, 68, 0.1);">
        <div style="color: #EF4444; font-weight: 700; margin-bottom: 8px;">[Scenario B] Malicious / Hallucinated Credential Infiltration</div>
        <div style="color: #64748B;">• Target: src/config.ts | Commit: fed705370c9e... | Agent: agent-cortex-secret</div>
        <div style="color: #F43F5E; margin-top: 8px;">+ const api_key = "ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";</div>
        <div style="color: #E2E8F0; margin-top: 8px;">✓ Cloudflare Artifacts Remote Push Completed (Branch Isolated)</div>
        <div style="color: #E2E8F0;">✓ Gate 01 (Secret Scanner) Intercepted in <span style="color: #EF4444; font-weight: 700;">0.74ms</span></div>
        <div style="color: #F87171;">✖ Violation: CRITICAL: Potential hardcoded secret or API token detected in diff</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.15); border-radius: 8px; border: 1px solid #EF4444; display: flex; justify-content: space-between;">
          <span style="color: #EF4444; font-weight: 800;">DECISION: DENY</span>
          <span style="color: #F8FAFC;">PROMOTION STATE: <b style="color: #EF4444;">BLOCKED</b></span>
          <span style="color: #94A3B8;">Downstream CI: Terminated</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_06",
    label: "06 / 10 • SCENARIO C: SENSITIVE SCHEMA CHANGE",
    title: "Critical Infrastructure: M-of-N Human Quorum",
    subtitle: "SQL Migration Touched ➔ Gate 04 Escalation ➔ FROZEN ➔ Multi-Sig Quorum ➔ AUTHORIZED",
    badge: "EVALUATION: ESCALATE",
    badgeColor: "#F59E0B",
    speech: "Certain changes are too sensitive for any single agent or single human to approve unilaterally. In this scenario, an agent pushes a database migration that alters relational table schemas. The ABS Gatekeeper detects the touch to critical infrastructure and triggers Gate 04, returning an ESCALATE decision. The promotion state is immediately frozen, and a persistent approval request is created with an explicit expiration window. To unfreeze the change, the platform requires an authenticated M-of-N human quorum. Two distinct human officers review the evidence and cast their cryptographic votes. Only after the second distinct approval is verified does the promotion state unlock from FROZEN to AUTHORIZED.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(245, 158, 11, 0.1);">
        <div style="color: #F59E0B; font-weight: 700; margin-bottom: 8px;">[Scenario C] Sensitive DDL Schema Migration Evaluation</div>
        <div style="color: #64748B;">• Target: migrations/001_sensitive.sql | Commit: 933942bec745...</div>
        <div style="color: #E2E8F0; margin-top: 8px;">✓ Gate 04 (Infrastructure Sentinel) Triggered: <span style="color: #F59E0B;">QUORUM_REQUIRED</span></div>
        <div style="color: #FBBF24;">➔ Approval Request ID: approval-d7f617ee... (Required Approvals: 2 Distinct Humans)</div>
        <div style="color: #94A3B8; margin-top: 4px;">• Approver 1 (Reviewer A) casts cryptographic vote ➔ [ APPROVED ] (Count: 1/2)</div>
        <div style="color: #94A3B8;">• Approver 2 (Reviewer B) casts cryptographic vote ➔ [ APPROVED ] (Count: 2/2)</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(245, 158, 11, 0.15); border-radius: 8px; border: 1px solid #F59E0B; display: flex; justify-content: space-between;">
          <span style="color: #F59E0B; font-weight: 800;">DECISION: ESCALATE</span>
          <span style="color: #F8FAFC;">STATE: <b style="color: #F59E0B;">FROZEN</b> ➔ <b style="color: #10B981;">AUTHORIZED</b></span>
          <span style="color: #94A3B8;">Quorum: 2/2 Authenticated</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_07",
    label: "07 / 10 • SCENARIO D: MULTI-AGENT CONFLICT",
    title: "Two-Agent Conflict & Re-governance",
    subtitle: "Divergent Commits on Common Base ➔ Line Conflict Detected ➔ Re-governed Resolution",
    badge: "ARBITRATION & RE-GOVERNANCE",
    badgeColor: "#A855F7",
    speech: "What happens when two autonomous agents work on the same codebase simultaneously? Here, Agent A and Agent B begin from the exact same base commit in isolated workspaces. Both modify the same shared file with conflicting logic and push their respective commits. Rather than failing silently, CORTEX analyzes the actual Git trees and line-level diffs from Artifacts, detecting the divergence. The task status transitions to RESOLUTION_PENDING. Resolving a conflict cannot simply be an unchecked merge: the resolution must be committed as a brand-new commit. That resolution commit is pushed, passes through the full ABS governance pipeline again, and only then achieves the AUTHORIZED promotion state.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(168, 85, 247, 0.1);">
        <div style="color: #A855F7; font-weight: 700; margin-bottom: 8px;">[Scenario D] Concurrent Multi-Agent AST Collision</div>
        <div style="color: #64748B;">• Shared File: src/shared.txt | Common Base: 6e0cdd45...</div>
        <div style="color: #E2E8F0; margin-top: 8px;">➔ Agent A pushes Commit 8accd4a7... (mode=agent-a)</div>
        <div style="color: #E2E8F0;">➔ Agent B pushes Commit a22b4378... (mode=agent-b)</div>
        <div style="color: #C084FC;">⚠ AST Conflict Detected: Conflicting candidates on same line offset</div>
        <div style="color: #E2E8F0;">➔ Task State: <b style="color: #F59E0B;">RESOLUTION_PENDING</b> (Resolution commit mandatory)</div>
        <div style="color: #38BDF8; margin-top: 4px;">➔ Agent synthesizes Resolution Commit 6127e606... (mode=resolved)</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(168, 85, 247, 0.15); border-radius: 8px; border: 1px solid #A855F7; display: flex; justify-content: space-between;">
          <span style="color: #A855F7; font-weight: 800;">RESOLUTION GOVERNED</span>
          <span style="color: #F8FAFC;">DECISION: <b style="color: #10B981;">ALLOW</b></span>
          <span style="color: #10B981; font-weight: 700;">PROMOTION: AUTHORIZED</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_08",
    label: "08 / 10 • SCENARIO E: IDEMPOTENT EVENT REPLAY",
    title: "Idempotent Replay & Audit Proof",
    subtitle: "Captured Cloudflare Event Replayed ➔ 1 Decision Row ➔ Zero Duplicate Transitions",
    badge: "IDEMPOTENCY GUARANTEE",
    badgeColor: "#06B6D4",
    speech: "Distributed cloud systems must be resilient to network retries, webhook re-deliveries, and replay attacks. In this test, the exact same Cloudflare push event is replayed against the governance endpoint. The system derives a deterministic idempotency key from the account ID, namespace, repository, ref, and commit SHA. The replay recognizes the captured event, returning the existing decision without duplicating transitions or creating redundant ledger entries. The summary confirms exactly one decision row with idempotent true, ensuring total consistency in persistent storage.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(6, 182, 212, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(6, 182, 212, 0.1);">
        <div style="color: #06B6D4; font-weight: 700; margin-bottom: 8px;">[Scenario E] Webhook Event Re-delivery & Idempotency Audit</div>
        <div style="color: #64748B;">• Target Event: Commit 714d9f6c95f1... | Event Key: e7198485...:cortex-git:...</div>
        <div style="color: #E2E8F0; margin-top: 8px;">$ curl -X POST /api/governance/714d9f6c.../replay</div>
        <div style="color: #22D3EE;">✓ Derived Event Key: SHA-256(accountId:namespace:repo:ref:commitSha)</div>
        <div style="color: #E2E8F0;">✓ Match Found: Captured event previously processed and sealed</div>
        <div style="color: #10B981;">✓ Replay Verification: Zero duplicate state mutations, zero duplicate rows</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(6, 182, 212, 0.15); border-radius: 8px; border: 1px solid #06B6D4; display: flex; justify-content: space-between;">
          <span style="color: #06B6D4; font-weight: 800;">IDEMPOTENT: TRUE</span>
          <span style="color: #F8FAFC;">DECISION ROWS: <b style="color: #38BDF8;">1</b></span>
          <span style="color: #10B981; font-weight: 700;">AUDIT INTEGRITY: VERIFIED</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_09",
    label: "09 / 10 • CLOUDFLARE PRODUCTION PROOF",
    title: "Live Cloudflare Telemetry: Workflow & D1",
    subtitle: "Real Push Events to Workflow Instances ➔ Authoritative D1 Database Records",
    badge: "PERSISTENT EVIDENCE",
    badgeColor: "#10B981",
    speech: "Here we examine the live telemetry directly on the Cloudflare infrastructure. On the left, we observe the active Cloudflare Workflow instances, triggered natively by the repository push event. On the right, we execute an authoritative SQL query against the remote Cloudflare D1 database. All six governance decisions are durably persisted with their corresponding commit SHAs, evaluation outcomes, promotion states, and RFC timestamps. This durable audit trail connects every autonomous code change to an immutable, cryptographically verifiable record.",
    cardHtml: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px;">
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(243, 128, 32, 0.3); border-radius: 14px; padding: 20px; font-family: monospace; font-size: 14px;">
          <div style="color: #F38020; font-weight: 700; margin-bottom: 12px;">Cloudflare Workflow Instances (Real Triggers)</div>
          <div style="color: #94A3B8; line-height: 1.8;">
            <div>• Instance: <span style="color: #38BDF8;">inst-6127e6</span> ➔ <span style="color: #10B981;">Complete (ALLOW)</span></div>
            <div>• Instance: <span style="color: #38BDF8;">inst-a22b43</span> ➔ <span style="color: #10B981;">Complete (RESOLVED)</span></div>
            <div>• Instance: <span style="color: #38BDF8;">inst-8accd4</span> ➔ <span style="color: #10B981;">Complete (RESOLVED)</span></div>
            <div>• Instance: <span style="color: #38BDF8;">inst-933942</span> ➔ <span style="color: #F59E0B;">Complete (ESCALATED)</span></div>
            <div>• Instance: <span style="color: #38BDF8;">inst-fed705</span> ➔ <span style="color: #EF4444;">Complete (DENIED)</span></div>
            <div>• Instance: <span style="color: #38BDF8;">inst-714d9f</span> ➔ <span style="color: #10B981;">Complete (ALLOW)</span></div>
          </div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 20px; font-family: monospace; font-size: 13px;">
          <div style="color: #10B981; font-weight: 700; margin-bottom: 12px;">Cloudflare D1 Query (Database ID: 21131839...)</div>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #64748B;">
              <th>Commit</th><th>Decision</th><th>Promotion</th>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);"><td style="color:#38BDF8;">6127e606</td><td style="color:#10B981;">ALLOW</td><td style="color:#10B981;">AUTHORIZED</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);"><td style="color:#38BDF8;">a22b4378</td><td style="color:#10B981;">ALLOW</td><td style="color:#94A3B8;">RESOLVED</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);"><td style="color:#38BDF8;">8accd4a7</td><td style="color:#10B981;">ALLOW</td><td style="color:#94A3B8;">RESOLVED</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);"><td style="color:#38BDF8;">933942be</td><td style="color:#F59E0B;">ESCALATE</td><td style="color:#10B981;">AUTHORIZED</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);"><td style="color:#38BDF8;">fed70537</td><td style="color:#EF4444;">DENY</td><td style="color:#EF4444;">BLOCKED</td></tr>
            <tr><td style="color:#38BDF8;">714d9f6c</td><td style="color:#10B981;">ALLOW</td><td style="color:#10B981;">AUTHORIZED</td></tr>
          </table>
        </div>
      </div>
    `
  },
  {
    id: "scene_10",
    label: "10 / 10 • CONCLUSION & SCOPE",
    title: "The Future of Autonomous Software",
    subtitle: "A Complete Governance Loop: Proven, Empirical, and Open Source",
    badge: "EXECUTIVE SUMMARY",
    badgeColor: "#38BDF8",
    speech: "In conclusion, CORTEX Git delivers what the agentic software era urgently demands: rigorous, deterministic governance between autonomous code generation and production shipping. Remember: AUTHORIZED signifies eligibility for promotion; this integration maintains clear separation from production deployment. Agent attribution is bound through task contracts and isolated workspaces. Cloudflare gives agents a place to build. CORTEX coordinates the work. ABS Core governs what is allowed to ship. Visit our open-source repository at github.com slash eusheriff slash cortex-git to reproduce the full pipeline.",
    cardHtml: `
      <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 32px; margin-top: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
          <div>
            <h4 style="color: #38BDF8; font-size: 20px; margin-bottom: 12px;">Core Guarantees Proven</h4>
            <ul style="color: #CBD5E1; font-size: 17px; line-height: 1.8; list-style: none;">
              <li>✔ Real Cloudflare Artifacts Git pushes over HTTPS</li>
              <li>✔ Sub-millisecond fail-closed gate enforcement</li>
              <li>✔ M-of-N human quorum for critical schema changes</li>
              <li>✔ Multi-agent conflict detection & re-governed resolution</li>
              <li>✔ Durable decision & promotion tracking in D1 database</li>
            </ul>
          </div>
          <div>
            <h4 style="color: #94A3B8; font-size: 20px; margin-bottom: 12px;">Scope & Boundaries</h4>
            <ul style="color: #94A3B8; font-size: 17px; line-height: 1.8; list-style: none;">
              <li>• AUTHORIZED = Eligible for promotion (not deployed to prod)</li>
              <li>• Agent attribution bound via task & isolated workspace</li>
              <li>• D1 database configured with EU jurisdiction</li>
              <li>• Zero alteration to ABS Core engine architecture</li>
            </ul>
          </div>
        </div>
        <div style="margin-top: 28px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #64748B; font-size: 16px;">github.com/eusheriff/cortex-git</div>
          <div style="color: #38BDF8; font-size: 18px; font-weight: 700;">Rodrigo Gomes • OConnector Technology • October 2026</div>
        </div>
      </div>
    `
  }
];

function generateHtmlSlide(scene) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px;
    height: 1080px;
    background: radial-gradient(circle at 50% 20%, #0F172A 0%, #070A12 100%);
    color: #F8FAFC;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 80px;
    overflow: hidden;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 24px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #F38020 0%, #E06010 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 24px;
    color: white;
  }
  .logo-text {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #F8FAFC;
  }
  .logo-badge {
    background: rgba(243, 128, 32, 0.15);
    color: #F38020;
    font-size: 13px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(243, 128, 32, 0.3);
  }
  .scene-pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 18px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1px;
    color: #94A3B8;
  }
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin: 20px 0;
  }
  .badge-tag {
    display: inline-block;
    color: ${scene.badgeColor};
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .title {
    font-size: 52px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -1px;
    color: #F8FAFC;
  }
  .subtitle {
    font-size: 24px;
    font-weight: 400;
    color: #94A3B8;
    margin-top: 10px;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 20px;
    font-size: 15px;
    color: #64748B;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚡</div>
      <div class="logo-text">CORTEX Git</div>
      <div class="logo-badge">Cloudflare Workers & Artifacts</div>
    </div>
    <div class="scene-pill">${scene.label}</div>
  </div>

  <div class="content">
    <div class="badge-tag">${scene.badge}</div>
    <div class="title">${scene.title}</div>
    <div class="subtitle">${scene.subtitle}</div>
    ${scene.cardHtml}
  </div>

  <div class="footer">
    <div>Cloudflare Connect 2026 Challenge Submission</div>
    <div>Rodrigo Gomes (OConnector Technology) • Apache-2.0</div>
  </div>
</body>
</html>`;
}

async function run() {
  console.log("================================================================================");
  console.log("  🎬 CORTEX Git — High-Definition 5+ Minute Video Production Pipeline");
  console.log("================================================================================");

  let totalDuration = 0;
  const segments = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    console.log(`\n[Scene ${i + 1}/${scenes.length}] Generating ${scene.id} (${scene.title})...`);

    // 1. Write HTML and render to 1920x1080 PNG
    const htmlFile = path.join(workDir, `${scene.id}.html`);
    const pngFile = path.join(workDir, `${scene.id}.png`);
    writeFileSync(htmlFile, generateHtmlSlide(scene));

    execSync(`"${chromeBin}" --headless --disable-gpu --screenshot="${pngFile}" --window-size=1920,1080 "${htmlFile}" 2>/dev/null`);
    console.log(`  ✓ Rendered 1080p slide: ${path.basename(pngFile)}`);

    // 2. Synthesize audio with say
    const aiffFile = path.join(workDir, `${scene.id}.aiff`);
    const aacFile = path.join(workDir, `${scene.id}.aac`);
    execSync(`say -v Samantha -r 155 "${scene.speech.replace(/"/g, '\\"')}" -o "${aiffFile}"`);
    execSync(`ffmpeg -y -i "${aiffFile}" -c:a aac -b:a 192k "${aacFile}" 2>/dev/null`);

    // 3. Measure duration
    const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${aacFile}"`).toString().trim();
    const audioDur = parseFloat(durStr);
    const sceneDur = audioDur + 2.0; // 2 seconds visual pause for smooth transition
    totalDuration += sceneDur;
    console.log(`  ✓ Audio narration generated: ${audioDur.toFixed(1)}s (Total segment: ${sceneDur.toFixed(1)}s)`);

    // 4. Create MP4 segment with looping image + audio
    const segmentFile = path.join(workDir, `${scene.id}.mp4`);
    execSync(`ffmpeg -y -loop 1 -i "${pngFile}" -i "${aacFile}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${sceneDur.toFixed(2)} "${segmentFile}" 2>/dev/null`);
    console.log(`  ✓ Encoded segment: ${path.basename(segmentFile)}`);
    segments.push(segmentFile);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`Total Projected Video Duration: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(2)} minutes)`);
  console.log("--------------------------------------------------------------------------------");

  // 5. Concatenate all segments
  console.log("\nAssembling final unified video...");
  const listFile = path.join(workDir, "concat_list.txt");
  const listContent = segments.map(f => `file '${f}'`).join("\n");
  writeFileSync(listFile, listContent);

  const finalVideo = "/Users/isheriffgomes/Downloads/cortex-git-video-production/cortex-git-demo.mp4";
  const archiveCopy = "/Users/isheriffgomes/Downloads/cortex-git-video-production/cortex-git-demo-full-5min.mp4";

  execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${finalVideo}" 2>/dev/null`);
  execSync(`cp -f "${finalVideo}" "${archiveCopy}"`);

  // 6. Verify with ffprobe
  const probeOutput = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideo}"`).toString().trim();
  const finalSecs = parseFloat(probeOutput);
  const minutes = Math.floor(finalSecs / 60);
  const seconds = Math.floor(finalSecs % 60);

  console.log("\n================================================================================");
  console.log(`  🏆 SUCCESS: Final Full Video Generated!`);
  console.log(`  • Path: ${finalVideo}`);
  console.log(`  • Duration: ${finalSecs.toFixed(1)}s (${minutes}m ${seconds}s)`);
  console.log(`  • Criteria: >= 5 minutes (300s) -> ${finalSecs >= 300 ? "PASSED (COMPLIANT)" : "FAILED"}`);
  console.log("================================================================================");
}

run().catch(err => {
  console.error("Video production error:", err);
  process.exit(1);
});
