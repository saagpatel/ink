# ink ✒️

## Overview
ink is a local-first Markdown workspace editor where AI suggestions appear as handwritten-style margin annotations — not inline autocomplete, not a chat sidebar. The visual metaphor is a thoughtful editor leaving notes in the margins of your draft. Runs entirely local via Tauri 2 + Ollama.

## Tech Stack
- Runtime: Tauri 2 (Rust backend locked to 2.11.3, React frontend)
- UI: React 19.3 + TypeScript 7.0.2 (strict)
- Editor: CodeMirror 6 (Markdown mode, `@codemirror/lang-markdown`)
- Annotations: SVG rendering via React, positioned using CM6's `EditorView.coordsAtPos()`
- Database: SQLite via `tauri-plugin-sql` (SQLx under the hood)
- AI: Ollama local REST API (`http://localhost:11434`) — `llama3.2:3b` default, configurable
- Styling: Tailwind CSS 4.3.3 via its Vite plugin
- Font: Caveat (Google Fonts) for handwriting-style annotation text

## Development Commands
- Use npm: the Makefile and Tauri build hooks invoke npm, with `package-lock.json` for reproducible installs. `pnpm-lock.yaml` is also committed, but `package.json` does not pin a package-manager version.
- Node.js: 20.19+ within 20.x, or 22.12+, as required by locked Vite 8.3.1.
- Install: `npm ci` (or `make install`).
- Frontend preview: `npm run dev` (or `make dev`); this does not launch the native shell.
- Frontend verification: `npm run build` (or `make build`) runs `tsc && vite build` with strict TypeScript checking.
- Desktop development/release: `npm run tauri dev` / `npm run tauri build` (requires Rust and Tauri platform prerequisites).
- Native verification: see the locked Cargo test/check commands in README.md.
- No frontend test, lint, or format script is configured.

## Development Conventions
- TypeScript strict mode — no `any` types, no `as` casts without a comment explaining why
- File naming: kebab-case for files, PascalCase for React components
- Git commits: conventional commits — `feat:`, `fix:`, `chore:`, `spike:`
- All Tauri commands typed end-to-end: Rust structs ↔ TypeScript interfaces via `tauri::command`
- SQL migrations live in `src-tauri/migrations/` as numbered files (`001_init.sql`, etc.)
- Unit tests for all data transform functions (annotation positioning math, text diff logic)

## Current Phase
**v1.0 — Phases 0–4 complete (foundation, editor, annotation engine, polish, stats/search/custom types + security hardening)**
See IMPLEMENTATION-ROADMAP.md for phase details.

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
