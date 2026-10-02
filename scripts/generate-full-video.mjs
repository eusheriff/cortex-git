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
    subtitle: "Evaluating Agent Commits Before Promotion",
    badge: "FOUNDATIONAL PROBLEM",
    badgeColor: "#F43F5E",
    speech: "AI coding agents can produce changes quickly, which makes it useful to evaluate a commit before authorizing its promotion. CORTEX Git connects Cloudflare Artifacts push events to a governance workflow: the Worker retrieves commit content, applies configured policy checks, and records a decision and promotion state. The project demonstrates this flow on Cloudflare infrastructure, while keeping deployment to production outside its scope.",
    cardHtml: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px;">
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 16px; padding: 32px;">
          <h3 style="color: #F43F5E; font-size: 24px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
            <span>•</span> Governance needs around agent commits
          </h3>
          <ul style="color: #94A3B8; font-size: 20px; line-height: 1.8; list-style: none;">
            <li>• Review changes before authorizing promotion</li>
            <li>• Treat Git author metadata as untrusted</li>
            <li>• Surface conflicting agent edits</li>
            <li>• Keep promotion decisions separate from Git pushes</li>
            <li>• Record decisions and promotion state in D1</li>
          </ul>
        </div>
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 32px;">
          <h3 style="color: #10B981; font-size: 24px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
            <span>🛡️</span> CORTEX Git Solution
          </h3>
          <ul style="color: #CBD5E1; font-size: 20px; line-height: 1.8; list-style: none;">
            <li>• Task dispatch and isolated Artifacts workspaces</li>
            <li>• Short-lived Artifacts workspace tokens</li>
            <li>• Six deterministic policy stages evaluate retrieved commit content</li>
            <li>• Ed25519 attestations bind an agent key to repository, ref, and commit</li>
            <li>• Human approval for selected sensitive paths</li>
          </ul>
        </div>
      </div>
      <div style="margin-top: 32px; text-align: center; padding: 20px; background: rgba(56, 189, 248, 0.08); border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2);">
        <span style="font-size: 22px; color: #38BDF8; font-weight: 600;">"Evaluate agent commits before authorizing promotion."</span>
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
    speech: "Cloudflare Artifacts provides the repositories, isolated workspaces, and short-lived write tokens used by the agents. CORTEX coordinates task dispatch and compares concurrent candidates for line-level conflicts. On a push event, the Worker retrieves the commit content and evaluates it through six deterministic policy stages, including configured secret patterns, dangerous-code patterns, agent signature verification, and human approval for selected sensitive paths. The resulting decision and promotion state are recorded in D1. This prototype demonstrates the governance flow; it does not deploy to production.",
    cardHtml: `
      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 16px; padding: 32px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
          <div style="flex: 1; background: rgba(30, 41, 59, 0.6); padding: 20px; border-radius: 12px; border-left: 4px solid #F59E0B; text-align: center;">
            <div style="font-size: 14px; color: #F59E0B; font-weight: 700; text-transform: uppercase;">1. Orchestration</div>
            <div style="font-size: 22px; color: #F8FAFC; font-weight: 700; margin: 8px 0;">CORTEX Engine</div>
            <div style="font-size: 14px; color: #94A3B8;">Task Dispatch & Line-Level Conflict Triage</div>
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
            <div style="font-size: 14px; color: #94A3B8;">Six Deterministic Policy Stages</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 24px;">
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 20px; color: #10B981; font-weight: 800;">ALLOW</div>
            <div style="font-size: 14px; color: #94A3B8; margin-top: 4px;">Authorized for CI / Deploy</div>
          </div>
          <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 10px; padding: 16px; text-align: center;">
            <div style="font-size: 20px; color: #F43F5E; font-weight: 800;">DENIED</div>
            <div style="font-size: 14px; color: #94A3B8; margin-top: 4px;">Promotion Blocked</div>
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
    title: "Repository & Reproduction Steps",
    subtitle: "Apache-2.0 License • OConnector Technology",
    badge: "SPECIFICATION",
    badgeColor: "#818CF8",
    speech: "The repository is published under the Apache 2.0 license. Its README lists the build, local checks, and requirements for the Cloudflare end-to-end demo, including an authenticated account, Artifacts, D1, a deployed Worker and Workflow, and a control key secret. The repository distinguishes its local simulation from the live E2E. The live E2E creates remote test repositories that are retained for audit and must be cleaned up separately.",
    cardHtml: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(129, 140, 248, 0.3); border-radius: 16px; padding: 24px;">
          <div style="font-size: 16px; color: #818CF8; font-weight: 700; text-transform: uppercase;">Repository & Metadata</div>
          <table style="width: 100%; margin-top: 16px; font-size: 16px; color: #CBD5E1; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">Repository</td><td style="font-family: monospace; color: #38BDF8;">eusheriff/cortex-git</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">License</td><td>Apache-2.0</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">Author</td><td>Rodrigo Gomes (OConnector Technology)</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);"><td style="padding: 10px 0; color: #64748B;">Platform</td><td>Cloudflare Workers & Artifacts (Open Beta)</td></tr>
            <tr><td style="padding: 10px 0; color: #64748B;">Database</td><td>D1 binding configured for the Worker</td></tr>
          </table>
        </div>
        <div style="background: #0F172A; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; font-family: monospace;">
          <div style="color: #64748B; font-size: 14px; margin-bottom: 12px;"># Reproduction Runbook</div>
          <div style="color: #38BDF8; font-size: 16px; line-height: 1.8;">
            <div>$ npm install</div>
            <div>$ npm run build</div>
            <div>$ npm test</div>
            <div style="color: #F59E0B; margin-top: 8px;">$ npm run demo:e2e <span style="color: #CBD5E1;"># Requires deployed Cloudflare resources</span></div>
            <div style="color: #94A3B8; margin-top: 8px;">See README for configuration and cleanup notes.</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "scene_04",
    label: "04 / 10 • SCENARIO A: SAFE CODE CHANGE",
    title: "Safe Feature: Evaluation & Promotion Eligibility",
    subtitle: "Cloudflare Artifacts Push ➔ Policy Evaluation ➔ ALLOW ➔ AUTHORIZED",
    badge: "EVALUATION: ALLOW",
    badgeColor: "#10B981",
    speech: "In this live scenario, an agent receives a task and an isolated Artifacts workspace, then pushes a commit using its short-lived write token. Cloudflare Artifacts sends the push event to the Governance Workflow. The Worker retrieves the commit, tree, and file blobs, evaluates the retrieved content, and records the decision and promotion state in D1. The SAFE scenario reached ALLOW and AUTHORIZED. AUTHORIZED means eligible for downstream promotion; this integration does not perform a production deployment.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(16, 185, 129, 0.1);">
        <div style="color: #10B981; font-weight: 700; margin-bottom: 8px;">[Scenario A] Safe Agent Code Mutation Execution</div>
        <div style="color: #64748B;">• Case: SAFE | Agent workspace: isolated Artifacts fork</div>
        <div style="color: #38BDF8; margin-top: 8px;">$ git push origin HEAD  ➔  Cloudflare Artifacts remote</div>
        <div style="color: #E2E8F0; margin-top: 8px;">✓ Cloudflare Event: cf.artifacts.repo.pushed (Delivered to Workflow)</div>
        <div style="color: #E2E8F0;">✓ Artifacts Content Retrieval: Commit + Tree + Blobs fetched securely</div>
        <div style="color: #E2E8F0;">✓ Six policy stages evaluated the retrieved commit</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.15); border-radius: 8px; border: 1px solid #10B981; display: flex; justify-content: space-between;">
          <span style="color: #10B981; font-weight: 800;">DECISION: ALLOW</span>
          <span style="color: #F8FAFC;">PROMOTION STATE: <b style="color: #10B981;">AUTHORIZED</b></span>
          <span style="color: #94A3B8;">Decision & promotion state persisted in D1</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_05",
    label: "05 / 10 • SCENARIO B: ROGUE INFILTRATION",
    title: "Configured Secret Pattern Detected",
    subtitle: "Synthetic Test Credential ➔ DENY ➔ Promotion BLOCKED",
    badge: "EVALUATION: DENIED",
    badgeColor: "#EF4444",
    speech: "In this E2E case, the agent pushes a synthetic test credential to its isolated Artifacts workspace. A configured regular expression matches the credential in the retrieved changed-file content, producing DENY and a BLOCKED promotion state. The push itself succeeds; the governance result blocks promotion. This demonstrates the configured pattern, not comprehensive secret detection.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(239, 68, 68, 0.1);">
        <div style="color: #EF4444; font-weight: 700; margin-bottom: 8px;">[Scenario B] Malicious / Hallucinated Credential Infiltration</div>
        <div style="color: #64748B;">• Case: SECRET | Synthetic test credential in changed file</div>
        <div style="color: #F43F5E; margin-top: 8px;">+ const api_key = "ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";</div>
        <div style="color: #E2E8F0; margin-top: 8px;">✓ Cloudflare Artifacts Remote Push Completed (Branch Isolated)</div>
        <div style="color: #E2E8F0;">✓ Configured secret pattern matched changed-file content</div>
        <div style="color: #F87171;">✖ Violation: CRITICAL: Potential hardcoded secret or API token detected in diff</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.15); border-radius: 8px; border: 1px solid #EF4444; display: flex; justify-content: space-between;">
          <span style="color: #EF4444; font-weight: 800;">DECISION: DENY</span>
          <span style="color: #F8FAFC;">PROMOTION STATE: <b style="color: #EF4444;">BLOCKED</b></span>
          <span style="color: #94A3B8;">Promotion: Blocked</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_06",
    label: "06 / 10 • SCENARIO C: SENSITIVE SCHEMA CHANGE",
    title: "Sensitive Path: Authenticated Human Quorum",
    subtitle: "Selected Path Touched ➔ ESCALATE ➔ FROZEN ➔ Approval Quorum ➔ AUTHORIZED",
    badge: "EVALUATION: ESCALATE",
    badgeColor: "#F59E0B",
    speech: "The gatekeeper routes changes to selected sensitive paths, including migration and infrastructure configuration files, to human approval. In this E2E case, the change receives ESCALATE and the promotion becomes FROZEN while an expiring approval request is pending. Distinct authenticated approvers vote using their individual credentials. Once the configured quorum is reached, the promotion becomes AUTHORIZED. The approval uses authenticated application credentials; it is not multisignature cryptography.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(245, 158, 11, 0.1);">
        <div style="color: #F59E0B; font-weight: 700; margin-bottom: 8px;">[Scenario C] Sensitive DDL Schema Migration Evaluation</div>
        <div style="color: #64748B;">• Case: SENSITIVE_CHANGE | Selected migration path</div>
        <div style="color: #E2E8F0; margin-top: 8px;">✓ Selected sensitive-path policy triggered: <span style="color: #F59E0B;">QUORUM_REQUIRED</span></div>
        <div style="color: #FBBF24;">➔ Expiring approval request (required approvals: 2 distinct approvers)</div>
        <div style="color: #94A3B8; margin-top: 4px;">• Authenticated approver A votes ➔ [ APPROVED ] (Count: 1/2)</div>
        <div style="color: #94A3B8;">• Authenticated approver B votes ➔ [ APPROVED ] (Count: 2/2)</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(245, 158, 11, 0.15); border-radius: 8px; border: 1px solid #F59E0B; display: flex; justify-content: space-between;">
          <span style="color: #F59E0B; font-weight: 800;">DECISION: ESCALATE</span>
          <span style="color: #F8FAFC;">STATE: <b style="color: #F59E0B;">FROZEN</b> ➔ <b style="color: #10B981;">AUTHORIZED</b></span>
          <span style="color: #94A3B8;">Authenticated quorum: 2/2</span>
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
        <div style="color: #A855F7; font-weight: 700; margin-bottom: 8px;">[Scenario D] Concurrent Multi-Agent Line Conflict</div>
        <div style="color: #64748B;">• Shared File: src/shared.txt | Common Base: 6e0cdd45...</div>
        <div style="color: #E2E8F0; margin-top: 8px;">➔ Agent A pushes a candidate from the common base</div>
        <div style="color: #E2E8F0;">➔ Agent B pushes a candidate from the same base</div>
        <div style="color: #C084FC;">⚠ Line Conflict Detected: Candidates changed overlapping lines</div>
        <div style="color: #E2E8F0;">➔ Task State: <b style="color: #F59E0B;">RESOLUTION_PENDING</b> (Resolution commit mandatory)</div>
        <div style="color: #38BDF8; margin-top: 4px;">➔ Resolution is committed and evaluated again</div>
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
    title: "Duplicate Event Replay",
    subtitle: "Identical Captured Event Replayed ➔ Existing Decision Reused",
    badge: "DUPLICATE HANDLING",
    badgeColor: "#06B6D4",
    speech: "This E2E case replays the same captured Cloudflare push payload. The event identity uses the account, namespace, repository, ref, and commit SHA. Processing recognizes the already-decided event and returns its existing state rather than creating a second decision. The README describes the exact verification scope and the current source should be redeployed and rerun after changes.",
    cardHtml: `
      <div style="background: #020617; border: 1px solid rgba(6, 182, 212, 0.4); border-radius: 16px; padding: 28px; font-family: monospace; font-size: 16px; line-height: 1.7; box-shadow: 0 0 30px rgba(6, 182, 212, 0.1);">
        <div style="color: #06B6D4; font-weight: 700; margin-bottom: 8px;">[Scenario E] Webhook Event Re-delivery & Idempotency Audit</div>
        <div style="color: #64748B;">• Target: previously captured Artifacts push event</div>
        <div style="color: #E2E8F0; margin-top: 8px;">$ replay captured event payload</div>
        <div style="color: #22D3EE;">✓ Event identity: account, namespace, repository, ref, and commit SHA</div>
        <div style="color: #E2E8F0;">✓ Match Found: Captured event already has a terminal decision</div>
        <div style="color: #10B981;">✓ Existing decision and promotion state returned</div>
        <div style="margin-top: 16px; padding: 12px; background: rgba(6, 182, 212, 0.15); border-radius: 8px; border: 1px solid #06B6D4; display: flex; justify-content: space-between;">
          <span style="color: #06B6D4; font-weight: 800;">DUPLICATE: RECOGNIZED</span>
          <span style="color: #F8FAFC;">DECISION: <b style="color: #38BDF8;">REUSED</b></span>
          <span style="color: #10B981; font-weight: 700;">STATE: PERSISTED IN D1</span>
        </div>
      </div>
    `
  },
  {
    id: "scene_09",
    label: "09 / 10 • CLOUDFLARE PRODUCTION PROOF",
    title: "Live Cloudflare E2E Evidence",
    subtitle: "Artifacts Push Events ➔ Workflow Processing ➔ Decisions & Promotion State in D1",
    badge: "PERSISTENT EVIDENCE",
    badgeColor: "#10B981",
    speech: "The README records the scope of the previously demonstrated live E2E: real Artifacts pushes triggered Workflow processing, and event payloads, decisions, and promotion states were stored in D1. The repository includes screenshots of the live demo and D1 evidence. The current source has since changed its signed attestation payload to include the ref, so redeploy and rerun the E2E before presenting those earlier results as verification of this revision. D1 stores the governance state; it is not an immutable cryptographic audit ledger.",
    cardHtml: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px;">
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(243, 128, 32, 0.3); border-radius: 14px; padding: 20px; font-family: monospace; font-size: 14px;">
          <div style="color: #F38020; font-weight: 700; margin-bottom: 12px;">Live integration path</div>
          <div style="color: #94A3B8; line-height: 1.8;">
            <div>• Cloudflare Artifacts receives a Git push</div>
            <div>• The native push event starts the Governance Workflow</div>
            <div>• The Worker retrieves commit, tree, and changed-file content</div>
            <div>• The gatekeeper returns a policy decision</div>
            <div>• Event, decision, and promotion state are persisted in D1</div>
            <div>• The README links screenshots from the recorded live run</div>
          </div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 20px; font-family: monospace; font-size: 13px;">
          <div style="color: #10B981; font-weight: 700; margin-bottom: 12px;">What the persisted records show</div>
          <div style="color: #CBD5E1; font-size: 16px; line-height: 2;">
            <div>Governance event identity</div>
            <div>Policy decision and outcome</div>
            <div>Promotion state and update time</div>
            <div>Approval and conflict state when applicable</div>
            <div style="margin-top: 12px; color: #F59E0B;">The per-evaluation Merkle data is not a durable aggregate ledger.</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "scene_10",
    label: "10 / 10 • CONCLUSION & SCOPE",
    title: "Prototype Scope & Next Verification Step",
    subtitle: "Open Source Governance Integration for Cloudflare Artifacts",
    badge: "EXECUTIVE SUMMARY",
    badgeColor: "#38BDF8",
    speech: "CORTEX Git is an open-source prototype connecting Cloudflare Artifacts push events to commit evaluation, human approval, conflict handling, and D1 promotion state. Its six policy stages use configured patterns and signature checks; they are not a complete security scanner. The agent key is bound to a task workspace, repository, ref, and commit, while the Artifacts event does not independently identify the Git token that pushed. AUTHORIZED means eligible for promotion; no production deploy is performed. See the README for limitations and the steps to reproduce the E2E.",
    cardHtml: `
      <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 32px; margin-top: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
          <div>
            <h4 style="color: #38BDF8; font-size: 20px; margin-bottom: 12px;">Demonstrated in the recorded E2E</h4>
            <ul style="color: #CBD5E1; font-size: 17px; line-height: 1.8; list-style: none;">
              <li>✔ Real Cloudflare Artifacts Git pushes over HTTPS</li>
              <li>✔ Configured secret-pattern case returned DENY</li>
              <li>✔ Authenticated human quorum for selected sensitive paths</li>
              <li>✔ Multi-agent conflict detection & re-governed resolution</li>
              <li>✔ Decision & promotion state stored in D1</li>
            </ul>
          </div>
          <div>
            <h4 style="color: #94A3B8; font-size: 20px; margin-bottom: 12px;">Scope & Boundaries</h4>
            <ul style="color: #94A3B8; font-size: 17px; line-height: 1.8; list-style: none;">
              <li>• AUTHORIZED = Eligible for promotion (not deployed to prod)</li>
              <li>• Agent key bound to task workspace; push token attribution is not proven</li>
              <li>• Pattern checks are heuristic, not complete static analysis</li>
              <li>• Merkle record is local to an evaluation, not an aggregate ledger</li>
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
