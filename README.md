# ink

[![TypeScript](https://img.shields.io/badge/typescript-%233178c6?style=flat-square&logo=typescript)](#) [![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](#)

> What if your AI editor left margin notes instead of interrupting your flow?

ink is a local-first Markdown workspace where AI suggestions appear as SVG overlay cards positioned alongside their anchor text — the visual metaphor of a thoughtful editor leaving notes in your margins, not an autocomplete system hijacking your cursor. Runs entirely on your machine via Tauri 2 and a local Ollama instance.

## Features

- **Margin annotations** — SVG overlay cards positioned via CodeMirror 6's `coordsAtPos()` API, scroll-aware and viewport-clipped
- **Five built-in annotation types** — clarify, expand, simplify, question, alternative; plus custom annotation type creation with configurable prompts
- **Local AI via Ollama** — defaults to `llama3.2:3b`, configurable to `qwen2.5:7b` or any Ollama model
- **Workspace folder view** — sidebar file tree for navigating a folder of Markdown files
- **Accept / dismiss** — accepting an annotation inserts its text at the anchor point
- **Annotation history** — per-file log of every annotation by status (pending, accepted, dismissed)
- **Stats dashboard** — acceptance rate, type breakdown, and latency metrics across the workspace
- **Workspace search** — search annotations across the workspace by content, type, and status
- **Debounced generation** — Ollama called 2,500ms after your last keypress, never on every keystroke
- **Settings panel** — configure endpoint, model, annotation density, and debounce delay

## Quick Start

### Prerequisites
- Rust stable toolchain
- Node.js 20+ and npm
- [Ollama](https://ollama.com) running locally

### Installation
```bash
git clone https://github.com/saagpatel/ink
cd ink
npm install

# Pull a model if you haven't already
ollama pull llama3.2:3b
```

### Usage
```bash
# Development
npm run tauri dev

# Build release app
npm run tauri build
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript 5.8 (strict) |
| Editor | CodeMirror 6 (@codemirror/lang-markdown) |
| Annotations | SVG overlay, positioned via EditorView.coordsAtPos() |
| Local AI | Ollama REST API (llama3.2:3b default) |
| Persistence | SQLite via @tauri-apps/plugin-sql |

## License

MIT
