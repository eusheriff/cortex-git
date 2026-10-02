# CORTEX Git — Cloudflare Artifacts governance integration

CORTEX Git connects Cloudflare Artifacts push events to the existing ABS Core Gatekeeper. A decision is useful only when the Worker retrieves the commit named by the event, evaluates that retrieved content, and persists a promotion state in D1. This repository is an integration prototype; a Worker deployment or a local `ALLOW` result alone is not proof of a complete governance pipeline.

## Current architecture

```text
Agent identity → isolated Artifacts fork + short-lived token → Git commit/push
  → cf.artifacts.repo.pushed → Governance Workflow → Artifacts commit/tree/blob reads
  → ABS Core Gatekeeper → D1 decision + promotion/approval/conflict state
```

`account_id:namespace:repository:ref:commit_sha` identifies a governance event. The push payload is captured before processing and is the sole source of commit identity. Diffs and changed paths are derived from the commit and its first-parent tree in Artifacts; no request-supplied diff or file body is accepted as evidence. Reprocessing an identical captured payload returns its existing state.

Git author name and email are metadata, not security identities. A task associates an agent public key with an isolated workspace; the agent signs the repository/commit/agent tuple. Workspace write tokens are short-lived and their hashes/IDs are recorded, never their plaintext values.

Promotion states are persisted separately from decisions: `ALLOW → AUTHORIZED`, `DENY → BLOCKED`, `ESCALATE → FROZEN`. Escalation creates an expiring approval request. Distinct authenticated approvers count once; approval changes the promotion from `FROZEN` to `AUTHORIZED`, while rejection or expiry blocks it. Parallel candidates from the same base are compared using their Artifacts trees and actual line-level changes. A conflict becomes `CONFLICT_DETECTED` then `RESOLUTION_PENDING`; a resolution must be a new commit and is evaluated by ABS Core again.

## Current verification status

The Worker, Workflow, D1 binding, schedule, and `cf.artifacts.repo.pushed` trigger are deployed. Cloudflare delivered real push events to Workflow instances; the event payload does not include `metadata.accountId`, so the Worker anchors the account identity to its configured account and rejects a supplied mismatching account ID. The canonical live run completed SAFE (`ALLOW → AUTHORIZED`), SECRET (`DENY → BLOCKED`), SENSITIVE_CHANGE (`ESCALATE → FROZEN → APPROVED → AUTHORIZED`), duplicate replay (one decision), and two-agent conflict detection/resolution. The resolution was a new commit and passed through governance again. Workflow event payloads, decisions, and promotion states were persisted in D1.

Automated local checks cover the existing crypto, gatekeeper, arbiter, and consensus regression cases. The local swarm demo remains a simulation; the canonical live E2E above is the evidence for real Artifacts Git pushes and conflict handling. No production deployment was performed: `AUTHORIZED` means promotion authorization only.

## Run checks

From this directory:

```bash
npm run build
npm test
npm exec --yes --package=wrangler@4.147.0 -- wrangler types
```

The real integration demo requires an authenticated Cloudflare account with Artifacts enabled, the configured D1 database/migration, the deployed Worker and event Workflow, plus the Worker secret `CORTEX_CONTROL_KEY`. Set `CORTEX_WORKER_URL` if using a different test Worker. Then run:

```bash
npm run demo:e2e
```

The script creates a uniquely named Artifacts source repository, seeds it with a real Git push, requests isolated forks and ephemeral agent tokens, then runs SAFE, SECRET, SENSITIVE_CHANGE, duplicate-event, and two-agent conflict/resolution cases. It waits for terminal event processing and persistent promotion state; it does not synthesize Cloudflare push events. It prints commit identities and outcomes only after checks pass. The script removes only its own generated local temporary directory. Remote test repositories and their history are intentionally retained for audit and must be removed separately when no longer needed. The demonstrated run used a temporary `CORTEX_CONTROL_KEY`, which was removed after verification.

`npm run demo` is the explicitly local swarm simulation; it is not the canonical E2E.

## Security and scope notes

- The timestamp proof currently implemented is a local hash-based timestamp, not an RFC 3161 TSA token.
- Approval is an authenticated human quorum, not multisignature cryptography.
- `AUTHORIZED` means promotion authorization / CI-deployment eligibility. No production deployment is performed by this integration.
- Artifacts event identity may not expose the Git token that performed a push. The current binding is agent key ↔ task ↔ workspace/repository, with Git metadata treated as untrusted; a stronger credential-to-event attribution requires a documented Cloudflare event principal or another verified mechanism.
- Keep Artifacts tokens, control secrets, private keys, and `.dev.vars` out of source control.
- ABS Core engine architecture and the separate `CORTEX` arbiter implementation are not changed by this integration.
