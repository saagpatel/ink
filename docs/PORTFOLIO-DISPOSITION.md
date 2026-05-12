# ink — Portfolio Disposition

**Status:** Release Frozen — Tauri 2 + Rust + TypeScript + CodeMirror 6
local-first Markdown workspace with margin annotations via local
Ollama. v1.0 shipped on `origin/main` (Phases 0-3 complete + Phase 4
stats dashboard / search / custom types / prompt customization), plus
security hardening (path restriction, SSRF guard, CSP) and `.dmg`
distribution build deps. Joins the signing cluster as the 20th member.

> Disposition uses strict `origin/main` verification.
> **Memory correction:** prior portfolio memory listed ink as "Phase
> 0." Actual state is v1.0 + Phase 4 complete. Memory is stale —
> this file is the corrected reference.

---

## Verification posture

This repo has **only `origin`** (`saagpatel/ink`) — no
`legacy-origin` remote. Clean migration state. Local clone's `main`
is tracking `origin/main` correctly.

Specifically verified on `origin/main`:

- Tip: `a12f920` chore: update build dependencies for `.dmg` distribution
- Substantive commits on `origin/main`:
  - `a12f920` chore: update build dependencies for `.dmg` distribution
  - `abf247f` chore: bump version to 1.0.0 and add devCsp for Vite HMR
  - `7b34c8d` test: add baseline Rust tests for fs safety, ollama validation, file tree
  - `de34019` fix(security): path restriction on write_file, SSRF guard on Ollama, CSP
  - `5fe231b` feat(phase-4): stats dashboard, search, custom types, prompt customization
  - `8bb2ca0` feat: ink v1.0 — Phases 0-3 complete
- Tree on `origin/main` is a real Tauri 2 + Rust desktop app:
  - `src-tauri/` (Rust backend with baseline tests)
  - `src/` (TypeScript frontend with CodeMirror 6)
  - `IMPLEMENTATION-ROADMAP.md` (phase plan)
  - `index.html`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`
- Release scaffolding: `.dmg` build deps updated but no
  `RELEASE-READINESS.md`-style runbook
- Default branch: `main`

---

## Memory correction

Prior portfolio-OS memory listed ink as: "ink (project_ink.md) —
Local-first Markdown workspace, Tauri 2, Phase 0."

That was wrong. As of this disposition pass, `origin/main` shows
v1.0 explicitly (`abf247f chore: bump version to 1.0.0`), Phases
0-3 complete (`8bb2ca0 feat: ink v1.0 — Phases 0-3 complete`), and
Phase 4 delivered (`5fe231b feat(phase-4): stats dashboard, search,
custom types, prompt customization`). The product is past Phase 0
by several phases.

This is the **second memory correction** in the session (after
ConvictionMapper's "V2 trapped local" claim which was also wrong).
Both involved memory understating shipped state. Worth a memory
sweep next session.

---

## Current state in one paragraph

ink is a Tauri 2 + Rust + TypeScript local-first Markdown workspace.
Its distinguishing concept: AI suggestions appear as SVG overlay
cards positioned via CodeMirror 6's `coordsAtPos()` API alongside
their anchor text — the visual metaphor of margin notes, not an
autocomplete that hijacks the cursor. Five annotation types
(clarify, expand, simplify, question, alternative). Local AI via
Ollama (default `llama3.2:3b`, configurable). Workspace folder view,
accept/dismiss flow, annotation history per file, debounced
generation, settings panel. Phase 4 added a stats dashboard, search,
custom annotation types, and prompt customization. Security pass
landed path restriction on `write_file`, SSRF guard on the Ollama
client, and CSP. Baseline Rust tests cover fs safety and Ollama
validation. v1.0 tagged on canonical main.

For full detail see:
- `README.md` on `origin/main`
- `IMPLEMENTATION-ROADMAP.md` on `origin/main`

---

## Why "Release Frozen" instead of other dispositions

- **Active** — wrong. The operator bumped to v1.0 and updated `.dmg`
  build deps. The product is positioned for ship, not for further
  scoped feature work.
- **Cold Storage / Archived** — wrong. v1.0 + security hardening
  + Phase 4 dashboard are all recent.
- **Release Frozen** — correct. Joins the cluster.

This is the **20th signing cluster member**: DesktopPEt /
ContentEngine / AIGCCore / Relay / FreeLanceInvoice / Nexus /
DeepTank / OPscinema / ShipKit / SignalFlow / PixelForge /
DatabaseSchema / LegalDocsReview / WorkdayDebrief / TicketDashboard
/ EarthPulse / RealEstate / DevToolsTranslator / SmartClipboard /
**ink**.

---

## Unblock trigger (operator)

When ready to ship:

1. Wire Apple Developer ID + notarization credentials. The
   `chore: update build dependencies for .dmg distribution` commit
   indicates the operator already started the `.dmg` packaging
   path.
2. Decide Ollama distribution posture for v1:
   - Document "requires Ollama running locally" (current README
     stance — operator-friction, but small audience)
   - Bundle a minimal Ollama runtime (large `.app`, single-click)
   - Hybrid (check-and-prompt-to-install)
3. Confirm `devCsp` from `abf247f` doesn't ship to production
   builds — the commit says it's for Vite HMR specifically.
4. Cut v1.0.0 release tag (already-bumped version).
5. Verify signed/notarized DMG opens without Gatekeeper warnings.

Estimated operator time once credentials are in hand: ~3 hours
including Ollama distribution decision and notarization round-trip.

---

## Portfolio operating system instructions

| Aspect | Posture |
|---|---|
| Portfolio status | `Release Frozen` |
| Memory note | **Update prior "Phase 0" claim** — ink is v1.0 + Phase 4 on `origin/main` |
| Review cadence | Suspend overdue counting |
| Resurface conditions | (a) Apple signing credentials wired, (b) operator picks Ollama distribution posture, or (c) operator opens a v1.1 scope packet |
| Co-batch with | Signing cluster: …SmartClipboard / **ink** — **now 20 repos** |
| Special concern | **Ollama distribution model.** Same shape as PixelForge model question and LegalDocsReview AI provider question — local model dependency vs API key vs hybrid. |
| Special concern | **devCsp.** Vite HMR CSP loosening should not ship to prod builds. |

---

## Memory sweep recommended

Two memory-stale-relative-to-canonical findings this session
(ConvictionMapper "V2 trapped local," ink "Phase 0") suggest the
portfolio memory has not been refreshed recently. Worth a sweep
next session: for every `project_*.md` memory file, compare its
status claim to the actual `origin/main` (or `origin/master`)
tip's recent feat commits.

---

## Reactivation procedure (for the next code session)

1. Verify `git branch -vv` shows `main` tracking `origin/main`.
   Already correct as of this disposition pass.
2. Review the local stash (`r10-ink-stash`) — contains mods to
   `CLAUDE.md`, `package-lock.json`, plus untracked `.claude/`,
   `.codex/`, `.serena/`. Decide what belongs on `origin/main`.
3. Delete stale `codex/*` branches.
4. Re-run `pnpm install && pnpm tauri build` to confirm toolchain.
5. **Pick Ollama distribution strategy before signing.**

---

## Last known reference

| Field | Value |
|---|---|
| `origin/main` tip | `a12f920` chore: update build dependencies for `.dmg` distribution |
| Last substantive commit | `5fe231b` feat(phase-4): stats dashboard, search, custom types, prompt customization |
| Version | **v1.0.0** (bumped at `abf247f`) |
| Default branch | `main` |
| Build system | Tauri 2 + Rust + TypeScript + Vite + CodeMirror 6 |
| Phases shipped | 0-3 (`8bb2ca0`) + 4 (`5fe231b`) + security hardening (`de34019`) + baseline Rust tests (`7b34c8d`) |
| Release scaffolding | `.dmg` build deps updated; no runbook docs |
| AI integration | Local Ollama (`llama3.2:3b` default) via `coordsAtPos()` margin annotations |
| Blocker | Apple signing + Ollama distribution decision + devCsp-prod audit (operator-only) |
| Migration state | **No `legacy-origin` remote** — clean |
| Distinguishing feature | **Margin-overlay AI metaphor** — SVG cards via CodeMirror coordsAtPos rather than inline autocomplete |
| Memory state | **Stale memory claim ("Phase 0") corrected to v1.0 + Phase 4** |
