# CORTEX Git — Cloudflare Competition Review Guide

## Project

- Public source repository: <https://github.com/eusheriff/cortex-git>
- Live Worker status endpoint: <https://cortex-git.xerifegomes.workers.dev/api/status>
- Runtime: Cloudflare Workers, Artifacts, D1, KV, and Workflows.

The status endpoint is intentionally public and returns only the service identity and trace ID. Administrative and state-changing API routes require a bearer control key; no key is included in this repository or this guide.

## Quick review

From a local clone, use the lockfile and run:

```bash
npm ci
npm test
npm run build
```

These checks exercise the local regression suite and TypeScript build. They do not contact or modify the live Cloudflare account.

To verify the public deployment responds:

```bash
curl -i https://cortex-git.xerifegomes.workers.dev/api/status
```

Expected result: HTTP 200 with `service: "cortex-git-governance"`.

## Live integration evidence

On 2026-10-07, the real Cloudflare E2E passed against the Hotmail-account deployment. It used real Artifacts Git pushes and verified:

- SAFE change: `ALLOW → AUTHORIZED`.
- Synthetic secret: `DENY → BLOCKED`.
- Sensitive change: `ESCALATE → APPROVED → AUTHORIZED`.
- Duplicate event replay: idempotent, one decision row.
- Two-agent conflicting edits: detected, then resolved by a new governed commit.

The fixture repository `cortex-e2e-afac4040` and its resulting test records are retained in the destination account for audit. This E2E is historical evidence for the tested revision and is not a promise of zero future failures.

## Re-running the live E2E

`npm run demo:e2e` requires the owner's authorized Cloudflare account, the deployed Worker secret `CORTEX_CONTROL_KEY`, and the Worker URL. It creates real Artifacts repositories, pushes commits, and writes governance data; remote fixtures are intentionally retained. Do not run it against production without the owner's approval and a dedicated, time-limited test credential delivered through an approved secure channel. Never request or place the owner's permanent control key in this repository, an issue, or chat.

No Cloudflare dashboard/API access is granted by this guide. For authenticated testing, coordinate directly with the project owner so access can be scoped and revoked after the review.

## Scope and limitations

- `AUTHORIZED` means promotion authorization only; the integration does not deploy application code.
- Gatekeeper secret/dangerous-code checks are heuristic patterns, not a complete security scanner.
- Merkle roots are per-evaluation in-memory records, not a durable aggregate ledger or WORM seal.
- The public status endpoint is not evidence by itself that protected governance routes work; use the E2E evidence above or a separately authorized test.

See [README.md](README.md) for architecture, audit history, and implementation details.
