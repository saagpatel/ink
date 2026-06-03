# ink ✒️

## Overview
ink is a local-first Markdown workspace editor where AI suggestions appear as handwritten-style margin annotations — not inline autocomplete, not a chat sidebar. The visual metaphor is a thoughtful editor leaving notes in the margins of your draft. Runs entirely local via Tauri 2 + Ollama.

## Tech Stack
- Runtime: Tauri 2.0 (Rust backend, React frontend)
- UI: React 19 + TypeScript 5.8 (strict)
- Editor: CodeMirror 6 (Markdown mode, `@codemirror/lang-markdown`)
- Annotations: SVG rendering via React, positioned using CM6's `EditorView.coordsAtPos()`
- Database: SQLite via `tauri-plugin-sql` (rusqlite under the hood)
- AI: Ollama local REST API (`http://localhost:11434`) — `llama3.2:3b` default, configurable
- Styling: Tailwind CSS v4 (npm)
- Font: Caveat (Google Fonts) for handwriting-style annotation text

## Development Conventions
- TypeScript strict mode — no `any` types, no `as` casts without a comment explaining why
- File naming: kebab-case for files, PascalCase for React components
- Git commits: conventional commits — `feat:`, `fix:`, `chore:`, `spike:`
- All Tauri commands typed end-to-end: Rust structs ↔ TypeScript interfaces via `tauri::command`
- SQL migrations live in `src-tauri/migrations/` as numbered files (`001_init.sql`, etc.)
- Unit tests for all data transform functions (annotation positioning math, text diff logic)

## Current Phase
**v1.0 — Phases 0–4 complete (foundation, editor, annotation engine, polish, stats/search/custom types + security hardening)**
See IMPLEMENTATION-ROADMAP.md for phase details. See `docs/PORTFOLIO-DISPOSITION.md` for current status and unblock triggers.

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Annotation persistence | App-level SQLite DB | Queryable history, annotation stats, cross-file search |
| File scope | Workspace/folder (sidebar file tree) | Right MVP — single-doc is too limited for real use |
| Annotation anchor model | Character offset spans (start_offset + end_offset) | Survives edits above anchor; line-level drifts on insert/delete |
| Annotation positioning | `EditorView.coordsAtPos()` + scroll-aware SVG overlay | CM6 virtualizes lines — DOM rect queries fail off-screen |
| AI model | `llama3.2:3b` default, `qwen2.5:7b` config option | Speed vs quality tradeoff; user-configurable in settings |
| File watching | Not implemented — `refreshTree()` re-polls on demand | External edits require manual refresh; active `watch()` was planned but not shipped |

## Do NOT
- Do not use `getBoundingClientRect()` on CodeMirror line elements — CM6 virtualizes the DOM and off-screen lines don't exist. Always use `EditorView.coordsAtPos()` for annotation positioning.
- Do not call the Ollama API on every keystroke — debounce 2500ms after last keypress.
- Do not store Ollama endpoint config in plaintext `.env` — use Tauri's store plugin for user preferences.
- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md.
- Do not use class components — hooks only.
- Do not add workspace sync, cloud save, or multi-user features — ink is intentionally local-first.

<!-- portfolio-context:start -->
# Portfolio Context

## What This Project Is

ink is a local-first Markdown workspace editor where AI suggestions appear as handwritten-style margin annotations — not inline autocomplete, not a chat sidebar. The visual metaphor is a thoughtful editor leaving notes in the margins of your draft. Runs entirely local via Tauri 2 + Ollama.

## Current State

**v1.0 — Phases 0–4 complete.** Foundation, editor, annotation engine, polish, and Phase 4 (stats dashboard, workspace search, custom annotation types, prompt customization) are all shipped. Security hardening (path restriction, SSRF guard, CSP) and baseline Rust tests landed as well.

## Stack

- Runtime: Tauri 2.0 (Rust backend, React frontend)
- UI: React 19 + TypeScript 5.8 (strict)
- Editor: CodeMirror 6 (Markdown mode, `@codemirror/lang-markdown`)
- Annotations: SVG rendering via React, positioned using CM6's `EditorView.coordsAtPos()`
- Database: SQLite via `tauri-plugin-sql` (rusqlite under the hood)
- AI: Ollama local REST API (`http://localhost:11434`) — `llama3.2:3b` default, configurable
- Styling: Tailwind CSS v4 (npm)
- Font: Caveat (Google Fonts) for handwriting-style annotation text

## How To Run

```bash
# Development
npm run tauri dev

# Build release app
npm run tauri build
```

## Known Risks

- Do not use `getBoundingClientRect()` on CodeMirror line elements — CM6 virtualizes the DOM and off-screen lines don't exist. Always use `EditorView.coordsAtPos()` for annotation positioning.
- Do not call the Ollama API on every keystroke — debounce 2500ms after last keypress.
- Do not store Ollama endpoint config in plaintext `.env` — use Tauri's store plugin for user preferences.
- Do not add features not in the current phase of IMPLEMENTATION-ROADMAP.md.
- Do not use class components — hooks only.
- Do not add workspace sync, cloud save, or multi-user features — ink is intentionally local-first.

## Next Recommended Move

**Release Frozen.** Unblock requires: (1) Apple Developer ID + notarization credentials wired, (2) Ollama distribution strategy decided (document-only / bundled runtime / hybrid), (3) confirm `devCsp` from Vite HMR does not ship to production builds. See `docs/PORTFOLIO-DISPOSITION.md` for full unblock procedure.

<!-- portfolio-context:end -->
