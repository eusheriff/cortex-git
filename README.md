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

For Cloudflare competition reviewers, see [COMPETITION_REVIEW.md](COMPETITION_REVIEW.md) for public checks, reproducible commands, live E2E evidence, and the access boundary. It contains no credentials.

## Original Gmail verification (2026-10-02)

The original Gmail Worker, Workflow, D1 binding, schedule, and `cf.artifacts.repo.pushed` trigger were deployed. On 2026-10-02, the canonical E2E passed against real Cloudflare infrastructure using source repository `cortex-e2e-526c1181`. It verified SAFE (`ALLOW → AUTHORIZED`), SECRET (`DENY → BLOCKED`), SENSITIVE_CHANGE (`ESCALATE → APPROVED → AUTHORIZED`), duplicate replay (one decision row), and two-agent conflict detection followed by resolution commit and authorized promotion. The script confirmed the resulting decisions and promotion states. This verifies the demonstrated workflow; it is not a claim that Cortex Git deploys or promotes application code by itself. `AUTHORIZED` means promotion authorization only.

Automated local checks cover the existing crypto, gatekeeper, arbiter, and consensus regression cases. The local swarm demo remains a simulation; the canonical live E2E above is the evidence for real Artifacts Git pushes and conflict handling. No application code deployment was performed: `AUTHORIZED` means promotion authorization only.

## Pre-migration audit snapshot (2026-10-07)

This read-only snapshot describes Gmail before the Hotmail deployment below. The audit found the Worker reachable (`GET /api/status` returned HTTP 200), 33 completed Workflow instances, and one failed instance caused by an invalid push event after retries. It also found seven captured events ignored because they came from repositories without a registered workspace. The repository's then-current tests (11) and TypeScript build passed, but the live Gmail deployment had no Workflow runs after 2026-10-02 and its latest deployment predated the latest GitHub push; this was not proof of current end-to-end health.

At that snapshot, the local source revision added regression tests for [the documented Cloudflare Artifacts push-event shape](https://developers.cloudflare.com/queues/event-subscriptions/events-schemas/) and control-key checks. Invalid or cross-account events were rejected before entering a retried Workflow step, so malformed input no longer consumed Workflow retries. The revocation-status API also required the same bearer control key as the other administrative endpoints. Those source changes were not deployed to Gmail by the read-only audit; they were later deployed and verified in Hotmail as documented below.

HTTP input errors return a client-safe 4xx response. Unexpected failures are logged with a trace ID and return a generic 500 response; internal exception messages are not sent to callers. Administrative endpoints require `Authorization: Bearer <CORTEX_CONTROL_KEY>`, while approval votes require an approver token. `/api/status` remains public and exposes only service identity and a trace ID.

For reproducible installs, use `npm ci` with the project npm lockfile. The npm override pins the vulnerable transitive Wrangler/Miniflare `sharp` dependency to patched version 0.35.5 ([GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)). Do not run `npm run demo:e2e` against production unless you intend to create retained remote test repositories; the script creates real Artifacts resources.

Pre-migration remediation checks on 2026-10-07: `npm ci`, `npm test` (15/15), `npm run build`, `npm audit --audit-level=moderate` (0 advisories), and `npx wrangler deploy --dry-run` passed. A local-only Worker smoke test confirmed `/api/status` (200), revocation status without a control key (401) and with a local test key (200), invalid JSON (400), and generic internal-error handling (500 without exception details). At that point, no production deployment or real Artifacts E2E had yet been performed; the Hotmail migration section below records the subsequent deployment and live E2E.

Gmail deployment attempt on 2026-10-07: Wrangler was explicitly targeted at the Gmail account (`e71984852bedaf5f21cef5d949948498`), and the remote Worker settings confirmed the expected Artifacts, D1, KV, Workflow, and control-key bindings. `wrangler deploy` was rejected by Cloudflare with error `10403`: Artifacts deployment requires a paid Workers plan on that account. The Gmail production deployment remained unchanged (version `0d915dd2-536e-47dd-adaa-54ed4362c4c1`, created 2026-10-02), and the public `/api/status` endpoint still returned 200. No GitHub push was made. This is a historical Gmail-specific result; the Hotmail deployment and E2E were completed afterward.

## Hotmail account migration (deployed and verified, 2026-10-07)

The requested destination is the Hotmail Cloudflare account (`6938b9775448fabcdd8f0c07283f87c1`); custom domains and the original Gmail Worker/resources remain in Gmail. This is a resource migration, not a transferable per-Worker plan: the isolated Hotmail Worker has its own copied resources and no custom domains or routes. Keep Gmail intact unless/until a separately planned DNS/domain cutover is approved.

Read-only inventory found no CORTEX Worker or Workflow in Hotmail; unrelated resources were left untouched. The destination D1 database `cortex-git-governance` is in ENAM (`abc2ff6c-59c7-49ca-804f-df12ba3b1438`), and the KV namespace is `CORTEX_KV` (`b4eb7e7ce3744ef485b83dd615c7b9c5`). The Artifacts namespace `cortex-git` now contains repository `cortex-git` (ID `euyhwicj80br8t01`), imported from the public GitHub `main` branch at commit `424f8bd1155aee9d80138439f242e94c2868fc3f`. The Artifact reports `ready`; its `README.md` and commit history were read back successfully.

A fresh, private SQL export of Gmail D1 was imported into Hotmail. At import time, all 15 application tables had matching row counts: 22 agents, 8 approval votes, 4 approvals, 8 approvers, 26 attestations, 26 commits, 12 conflict transitions, 4 conflicts, 1 migration record, 26 decisions, 33 governance events, 64 promotion transitions, 26 promotions, 18 tasks, and 22 workspaces. The source and destination KV namespaces were both empty. This Worker has no R2 binding, so no R2 data was in scope. The Gmail database, KV and Artifacts resources remain intact. Source Workflow history was not copied by recreating a Workflow.

The Worker `cortex-git` and Workflow `cortex-git-governance` are deployed in Hotmail at `https://cortex-git.xerifegomes.workers.dev`; the D1, KV, Artifact namespace, Workflow, five-minute schedule, and Artifact push event trigger are bound. The Hotmail-only `CORTEX_CONTROL_KEY` is configured as a remote secret and stored in macOS Keychain (service `cortex-git-hotmail-CORTEX_CONTROL_KEY`, account `cortex-git-hotmail`). Gmail's secret was not read or modified. The local Wrangler credential can manage Hotmail resources; the Cloudflare MCP session itself remains authenticated only to Gmail.

To load the locally stored key for an administrative command without printing it, run `export CORTEX_CONTROL_KEY="$(security find-generic-password -a cortex-git-hotmail -s cortex-git-hotmail-CORTEX_CONTROL_KEY -w)"` in the project shell. Do not echo it or paste it into chat.

The first live push surfaced a mismatch between the documented Artifacts event schema and the delivered event: runtime events omitted `source.type`. Validation now accepts that observed shape while still requiring the push event type, namespace/repository, valid commit SHA, and matching account metadata when present. The live E2E then passed against Hotmail (`cortex-e2e-afac4040`): safe change `ALLOW → AUTHORIZED`, synthetic secret `DENY → BLOCKED`, sensitive change `ESCALATE → APPROVED → AUTHORIZED`, duplicate replay remained idempotent (one decision row), and two-agent conflict detection/resolution completed with an authorized resolution commit. This also verifies real Artifacts pushes, Workflow processing, D1 persistence, and promotion transitions on the destination account.

Verification after the correction: `npm test` passes 16/16, TypeScript compilation passes, the Hotmail secret-auth probe returns the expected validation response (400, not 401), and the full live E2E reports `REAL_CLOUDFLARE_E2E_PASS`. The live E2E creates remote Artifacts fixture repositories and governance rows that are intentionally retained for audit. No custom domain, DNS record, or GitHub repository was changed. This confirms the migrated Worker workflow; it is not a guarantee of zero future errors or a claim that the whole project is universally “100%.”

A temporary Wrangler development preview using a dummy control key returned `/api/status` 200, missing-key authorization 401, dummy-key authorization 200, and malformed JSON 400. A request that hit an uninitialized local D1 returned only the generic 500 body, confirming internal error details are not exposed; this local D1 failure is not a test of the imported remote database. The preview was stopped, and no production Worker was deployed or application data written by these smoke requests.

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
