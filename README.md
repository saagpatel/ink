# ink

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/saagpatel/ink)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8.svg?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A local-first Markdown workspace where AI suggestions appear as handwritten-style margin annotations. The visual metaphor is a thoughtful editor leaving notes in the margins of your draft — not inline autocomplete, not a chat sidebar.

Runs entirely on your machine via Tauri 2 and a local Ollama instance. No data leaves your computer.

![Screenshot placeholder](docs/screenshot.png)

---

## Features

- **Margin annotations** — AI suggestions rendered as SVG overlay cards positioned alongside their anchor text using CodeMirror 6's `coordsAtPos()` API, scroll-aware and viewport-clipped
- **Five annotation types** — clarify, expand, simplify, question, alternative — cycled based on your writing and density setting
- **Local AI via Ollama** — defaults to `llama3.2:3b`, configurable to `qwen2.5:7b` or any model available in your Ollama instance
- **Workspace folder view** — sidebar file tree for navigating a folder of Markdown files, not just a single document
- **Accept / dismiss** — accepting an annotation inserts its text at the anchor point; all actions are persisted to a local SQLite database
- **Annotation history** — per-file log of every annotation by status (pending, accepted, dismissed)
- **Debounced generation** — Ollama is called 2500ms after your last keypress, not on every keystroke
- **Settings panel** — configure Ollama endpoint, model, annotation density (off → occasional → normal → frequent), and debounce delay

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Tauri 2 (Rust backend, WebView frontend) |
| Frontend | React 19 + TypeScript 5.8 (strict) |
| Editor | CodeMirror 6 (`@codemirror/lang-markdown`) |
| Annotations | SVG overlay, positioned via `EditorView.coordsAtPos()` |
| AI | Ollama local REST API (`http://localhost:11434`) |
| Database | SQLite via `tauri-plugin-sql` (rusqlite) |
| Styling | Tailwind CSS 4 + Caveat font (handwriting style) |
| Markdown rendering | `marked` |

---

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform
- [Ollama](https://ollama.com) running locally with at least one model pulled:

```bash
ollama pull llama3.2:3b
```

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/saagpatel/ink.git
cd ink

# 2. Install frontend dependencies
npm install

# 3. Start Ollama (if not already running)
ollama serve

# 4. Launch in development mode
npm run tauri dev
```

On first launch, ink creates a SQLite database at `~/Library/Application Support/ink/ink.db` (macOS) and runs the schema migrations automatically.

To build a production app bundle:

```bash
npm run tauri build
```

---

## Project Structure

```
ink/
├── src/                          # React frontend
│   ├── components/               # WorkspaceSidebar, EditorPane, AnnotationOverlay, SettingsPanel
│   ├── hooks/                    # useWorkspace, useEditor, useAnnotations, useOllama, useSettings
│   ├── lib/                      # annotation-positioner, prompt-templates, text-utils, db
│   ├── types/                    # Shared TypeScript interfaces
│   └── App.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands/             # fs.rs (file I/O), ollama.rs (Ollama proxy)
│   │   └── lib.rs
│   ├── migrations/               # 001_init.sql, 002_settings.sql
│   └── Cargo.toml
├── package.json
└── IMPLEMENTATION-ROADMAP.md     # Full phase-by-phase build plan
```

---

## Configuration

Settings are stored in the app's SQLite database (not in `.env` files). Open the settings panel inside ink to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| `ollama_endpoint` | `http://localhost:11434` | Ollama server URL |
| `ollama_model` | `llama3.2:3b` | Model used for annotation generation |
| `annotation_density` | `2` (normal) | 0 = off, 1 = occasional, 2 = normal, 3 = frequent |
| `debounce_ms` | `2500` | Milliseconds of silence before triggering Ollama |

---

## Current State

Phase 0 (foundation) is complete: Tauri 2 scaffold, SQLite schema with migrations, Ollama connectivity check, and workspace file-tree commands are all wired up.

See [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md) for the full phase plan through the annotation engine (Phase 2) and polish (Phase 3).

---

## License

MIT — see [LICENSE](LICENSE).
