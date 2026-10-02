# CORTEX Git — Cloudflare Artifacts governance integration

CORTEX Git connects Cloudflare Artifacts push events to the existing ABS Core Gatekeeper. A decision is useful only when the Worker retrieves the commit named by the event, evaluates that retrieved content, and persists a promotion state in D1. This repository is an integration prototype; a Worker deployment or a local `ALLOW` result alone is not proof of a complete governance pipeline.

## Current architecture

```text
Agent identity → isolated Artifacts fork + short-lived token → Git commit/push
  → cf.artifacts.repo.pushed → Governance Workflow → Artifacts commit/tree/blob reads
  → ABS Core Gatekeeper → D1 decision + promotion/approval/conflict state
```

`account_id:namespace:repository:ref:commit_sha` identifies a governance event. The push payload is captured before processing and is the sole source of commit identity. Changed paths and current content for changed files are derived from the commit and its first-parent tree in Artifacts; no request-supplied diff or file body is accepted as evidence. Reprocessing an identical captured payload returns its existing state.

Git author name and email are metadata, not security identities. A task associates an agent public key with an isolated workspace. Workspace write tokens are short-lived and their hashes/IDs are recorded, never their plaintext values.

Promotion states are persisted separately from decisions: `ALLOW → AUTHORIZED`, `DENY → BLOCKED`, `ESCALATE → FROZEN`. Escalation creates an expiring approval request. Distinct authenticated approvers count once; approval changes the promotion from `FROZEN` to `AUTHORIZED`, while rejection or expiry blocks it. Parallel candidates from the same base are compared using their Artifacts trees and actual line-level changes. A conflict becomes `CONFLICT_DETECTED` then `RESOLUTION_PENDING`; a resolution must be a new commit and is evaluated by ABS Core again.

Agent attestations sign a JSON tuple containing the repository, ref, commit SHA, and agent ID; the ref is checked against the push event when the attestation is retrieved. The signature does not cover the prompt hash, local timestamp, or Merkle root. Git author name and email remain untrusted metadata. The event does not prove which token performed the push, so the attestation establishes control of the registered agent key, not independent credential-to-event attribution.

The gatekeeper currently implements six numbered policy stages (`0`–`5`): revocation/kill-switch lookup, configured secret-pattern scanning, configured dangerous-code-pattern scanning, Ed25519 signature verification, approval for selected sensitive paths, and a local timestamp/Merkle record. Secret and dangerous-code checks are heuristic regular expressions over the full content of changed files, not a unified line diff; the dangerous-code check is not AST analysis, and the secret patterns do not cover every credential format. These stages should not be described as a complete security scanner.

The gatekeeper instance keeps Merkle leaves and records only in memory. A live event creates a gatekeeper instance for its evaluation, so its Merkle root is a per-evaluation value rather than a durable, cross-event ledger or WORM proof. The decision outcome is stored in D1, but the Merkle structure itself is not maintained as an aggregate audit log.

## Current verification status

The Worker, Workflow, D1 binding, schedule, and `cf.artifacts.repo.pushed` trigger are deployed. On 2026-10-02, the canonical E2E passed against real Cloudflare infrastructure using source repository `cortex-e2e-526c1181`. It verified SAFE (`ALLOW → AUTHORIZED`), SECRET (`DENY → BLOCKED`), SENSITIVE_CHANGE (`ESCALATE → APPROVED → AUTHORIZED`), duplicate replay (one decision row), and two-agent conflict detection followed by resolution commit and authorized promotion. The script confirmed the resulting decisions and promotion states. This verifies the demonstrated workflow; it is not a claim that Cortex Git deploys or promotes application code by itself. `AUTHORIZED` means promotion authorization only.

Automated local checks cover the existing crypto, gatekeeper, arbiter, and consensus regression cases. The local swarm demo remains a simulation; the canonical live E2E above is the evidence for real Artifacts Git pushes and conflict handling. No application code deployment was performed: `AUTHORIZED` means promotion authorization only.

## Run checks

From this directory:

```bash
npm run build
npm test
```

`npm run build` regenerates the Cloudflare binding types before compiling TypeScript.

The real integration demo requires an authenticated Cloudflare account with Artifacts enabled, the configured D1 database/migration, the deployed Worker and event Workflow, plus the Worker secret `CORTEX_CONTROL_KEY`. Set `CORTEX_WORKER_URL` if using a different test Worker. The control key is a persistent Worker secret and should be rotated or removed when no longer needed. Then run:

```bash
npm run demo:e2e
```

The script creates a uniquely named Artifacts source repository, seeds it with a real Git push, requests isolated forks and ephemeral agent tokens, then runs SAFE, SECRET, SENSITIVE_CHANGE, duplicate-event, and two-agent conflict/resolution cases. It waits for terminal event processing and persistent promotion state; it does not synthesize Cloudflare push events. It prints commit identities and outcomes only after checks pass. The script removes only its own generated local temporary directory. Remote test repositories and their history are intentionally retained for audit and must be removed separately when no longer needed.

`npm run demo` is the explicitly local swarm simulation; it is not the canonical E2E.

## Security and scope notes

- The timestamp proof currently implemented is a local hash-based timestamp, not an RFC 3161 TSA token.
- Gate checks are heuristic pattern checks, not a complete security scanner or AST analysis.
- Merkle roots are in-memory per-evaluation records, not a durable aggregate ledger or WORM seal.
- Approval is an authenticated human quorum, not multisignature cryptography.
- `AUTHORIZED` means promotion authorization / CI-deployment eligibility. No production deployment is performed by this integration.
- Artifacts event identity may not expose the Git token that performed a push. Attestation binds the registered agent key to a repository, ref, and commit, while Git metadata is treated as untrusted; this does not independently prove which credential delivered the event.
- Keep Artifacts tokens, control secrets, private keys, and `.dev.vars` out of source control.
- ABS Core engine architecture and the separate `CORTEX` arbiter implementation are not changed by this integration.
