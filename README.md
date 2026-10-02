# ⚡ CORTEX Git — Autonomous Software Governance on Cloudflare

> **"Agents can write the code. ABS Core decides whether the change is allowed to proceed."**  
> **"Cloudflare gives agents a place to build. CORTEX coordinates the work. ABS Core governs what is allowed to ship."**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Cloudflare Artifacts](https://img.shields.io/badge/Cloudflare-Artifacts%20Beta-black?logo=git)](https://blog.cloudflare.com/next-git-platform-on-cloudflare/)
[![Tests Passing](https://img.shields.io/badge/Tests-6%2F6%20Passing-10b981)]()
[![Security](https://img.shields.io/badge/Runtime%20Firewall-Fail--Closed-ef4444)]()
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

---

## 🏛️ Architecture & Separation of Concerns

Rather than rebuilding Git or turning ABS Core into another Git server, **CORTEX Git** enforces a strict, clean separation of duties between the development platform, the code producers, and the actuation authority:

- **Cloudflare Artifacts:** Controls the development environment (repositories, isolated forks, workspaces, ephemeral write tokens, and standard Git-over-HTTPS protocol).
- **Autonomous Agents:** Produce code changes and push commits via standard Git tooling.
- **CORTEX:** Coordinates task planning, sub-millisecond AST conflict triage, and multi-agent synthesis.
- **ABS Core:** Authoritatively governs whether a change is allowed to ship, evaluating real commits through an 11-Gate Fail-Closed Pipeline.

```
                  CORTEX
                    │
                    ▼
             Task / Planning
                    │
                    ▼
        Cloudflare Artifacts
          ┌─────────┴─────────┐
          │                   │
       Workspace           Git repo
          │                   │
          ▼                   ▼
       Agent ─────────────► git push
                              │
                              ▼
                    Cloudflare Event
                              │
                              ▼
                       ABS GATEKEEPER
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
               ALLOW        DENY       ESCALATE
                 │                         │
                 ▼                         ▼
             CI / Deploy              Human quorum
                 │
                 ▼
              Production
                 │
                 ▼
          Cryptographic Ledger
```

---

## 🔑 Answers to Cloudflare's Four Core Questions

In their [launch announcement](https://blog.cloudflare.com/next-git-platform-on-cloudflare/), Cloudflare posed the fundamental questions of the agentic era:

| Cloudflare's Question | The Traditional Git Failure | The CORTEX + ABS Core Solution |
| :--- | :--- | :--- |
| **1. How do agents know what other agents are working on?** | Agents read stale branches and blind-push conflicting PRs. | **Pre-dispatch Arbiter (JEV System 1):** Intercepts agent intent in sub-millisecond latency (0.05ms P50), partitions the AST target graph, and spins up isolated `env.ARTIFACTS.fork()` workspaces without collision. |
| **2. What happens when they make conflicting changes?** | Git aborts with manual merge conflict markers (`<<<<<<< HEAD`). | **Autonomous Consensus Engine:** Compares competing agent proposals, scores them on test pass rate, code simplicity (Karpathy principle), and security ratings, synthesizing the mathematically superior branch. |
| **3. How do you review everything they produce?** | Humans drown in hundreds of unvetted LLM-generated pull requests. | **Fail-Closed 11-Gate Pipeline:** Evaluates real commits in < 1.5ms. Blocks hardcoded secrets and dangerous calls, while escalating to **M-of-N Human Quorums** only when critical infrastructure (`wrangler.toml`, `migrations/`) is touched. |
| **4. How do you track not just WHAT changed, but WHY?** | Generic commit messages written by models (`"update code"`). | **"Why It Changed" Synthesis Matrix & WORM Ledger:** Commits are permanently anchored with prompt hashes, Ed25519 signatures, RFC 3161 timestamps, and Merkle inclusion proofs (SPV). |

---

## 🎯 The Three Canonical Governance States

ABS Core classifies every incoming commit into one of three deterministically audited states:

```
                ALLOW
                  ↓
                DENY
                  ↓
         ESCALATE / QUORUM_REQUIRED
```

1. **`ALLOW`**: The code change passes all safety invariants, contains no injected credentials, and adheres to scope. Promoted immediately to downstream CI/deploy.
2. **`DENY`**: Fail-Closed interdiction. Hardcoded secrets, unauthorized syscalls, or policy violations immediately terminate the pipeline without side effects.
3. **`ESCALATE`**: Sensitive changes (database migrations, cloud infrastructure configurations) trigger an M-of-N cryptographic human quorum, halting execution until verified human officers sign off.

---

## ⚡ Quickstart & Live Reproduction

### Prerequisites
- Node.js ≥ 20
- Cloudflare Wrangler CLI (`npm install -g wrangler`)
- Authenticated Cloudflare account with Artifacts Beta enabled

### 1. Run Unit Tests (100% Pass Rate)
Verify the core cryptographic and algorithmic guarantees:
```bash
npm test
```
*Output: 6/6 tests passing in under 170ms.*

### 2. Run the Real Cloudflare End-to-End Governance Pipeline
Run the fully automated, zero-assumption E2E verification against live Cloudflare Artifacts infrastructure:
```bash
npm run demo:e2e
```
*What this test executes:*
1. **Agent Provisioning:** Generates Ed25519 cryptographic keypairs for the agent.
2. **Workspace Creation:** Creates a real Cloudflare Artifacts repository via the Cloudflare API.
3. **Ephemeral Credential:** Issues a 30-minute scoped write token (`art_v2_x_...`).
4. **Commit A (Safe Code):** Commits clean feature $\rightarrow$ `git push` over HTTPS $\rightarrow$ Evaluated by ABS Gatekeeper $\rightarrow$ **`ALLOW`** (Promoted to CI/Production, sealed with RFC 3161 timestamp and Merkle proof).
5. **Commit B (Rogue Secret):** Injects a hardcoded API credential $\rightarrow$ `git push` over HTTPS $\rightarrow$ Evaluated by ABS Gatekeeper $\rightarrow$ **`DENIED`** (Fail-Closed, zero side effects permitted).
6. **Commit C (Schema Migration):** Modifies database schema DDL $\rightarrow$ `git push` over HTTPS $\rightarrow$ Evaluated by ABS Gatekeeper $\rightarrow$ **`QUORUM_REQUIRED`** (Frozen pending 2 human cryptographic signatures).

### Verified Verification Matrix
```
================================================================================
  🏆 CANONICAL DEMONSTRATION MATRIX — 100% REPRODUCIBLE & VERIFIED
================================================================================
  COMMIT A (Safe Feature):      ➔ [ ALLOW ]           ➔ Promoted to CI/Production
  COMMIT B (Secret Injected):   ➔ [ DENIED ]          ➔ Fail-Closed Terminated
  COMMIT C (Schema Migration):  ➔ [ QUORUM_REQUIRED ] ➔ Frozen for Human Quorum
--------------------------------------------------------------------------------
  Cryptographic Ledger Status:  ➔ 2 Sealed SARs | Merkle Root: 0x8c4a6caf51d...
================================================================================
```

### 3. Run the Multi-Agent Swarm Simulation
Experience concurrent multi-agent arbitration and consensus locally:
```bash
npm run demo
```

### 4. Run the Local Edge Dashboard
Launch the Cloudflare Worker locally:
```bash
npm run dev
```
Open [http://localhost:8787](http://localhost:8787) to view the live dashboard displaying active workspaces, push events, and cryptographic ledger proofs.

---

## 📦 What Makes CORTEX Git the Winning Entry?

1. **Proven Against Real Cloudflare Infrastructure:** Zero mockups. Uses real `ARTIFACTS` namespaces, real ephemeral tokens, and real `git push` over HTTPS.
2. **Deterministic Governance:** Shifts AI safety from fuzzy prompt guards to mathematical runtime firewalls with Ed25519 attestation, RFC 3161 timestamps, and Merkle inclusion proofs.
3. **High-Integrity Simplicity:** Follows the Karpathy Protocol — minimum viable complexity, surgical changes, and radical simplicity.
4. **Permissive Open Source:** Licensed under **Apache-2.0** for immediate adoption by the Cloudflare developer ecosystem.

---

*Architected by the CORTEX / ABS Core Engineering Team for the Cloudflare Artifacts Challenge (October 2026).*
