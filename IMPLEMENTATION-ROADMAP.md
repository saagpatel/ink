# ink ✒️ — Implementation Roadmap

## Architecture

### System Overview

```
[Workspace Folder on Disk]
        │
        │  file read/watch (Tauri fs plugin)
        ▼
[Tauri Rust Backend]
  - File I/O commands
  - SQLite (rusqlite)
  - Ollama HTTP client
        │
        │  Tauri IPC (invoke/emit)
        ▼
[React Frontend]
  ├── WorkspaceSidebar       ← file tree, folder navigation
  ├── EditorPane             ← CodeMirror 6 (Markdown mode)
  ├── AnnotationOverlay      ← SVG layer, absolute-positioned over editor
  └── SettingsPanel          ← Ollama endpoint, model, annotation density
        │
        │  coordsAtPos() → SVG y-position
        ▼
[Annotation Positioning Engine]
  - CM6 EditorView.coordsAtPos(charOffset)
  - Converts char offset → pixel coords
  - Clips annotations to visible scroll window
  - Re-computes on scroll, resize, editor content change
        │
        ▼
[Ollama Local API]  http://localhost:11434
  - POST /api/generate
  - Model: llama3.2:3b (default) or qwen2.5:7b (config)
  - 2500ms debounce after last keypress
  - Structured prompt → typed annotation output
```

---

### File Structure

```
ink/
├── src/                            # React frontend
│   ├── components/
│   │   ├── WorkspaceSidebar.tsx    # File tree, folder open/close, active file highlight
│   │   ├── EditorPane.tsx          # CodeMirror 6 instance, scroll sync, cursor tracking
│   │   ├── AnnotationOverlay.tsx   # SVG layer rendered over editor, annotation cards
│   │   ├── AnnotationCard.tsx      # Single annotation: type badge, text, accept/dismiss buttons
│   │   ├── StatusBar.tsx           # Bottom bar: file path, word count, annotation count, model status
│   │   └── SettingsPanel.tsx       # Ollama endpoint, model selector, density slider
│   ├── hooks/
│   │   ├── useWorkspace.ts         # Workspace folder state, file tree, open/watch
│   │   ├── useEditor.ts            # CodeMirror instance ref, content state, scroll position
│   │   ├── useAnnotations.ts       # Annotation CRUD, positioning, accept/dismiss handlers
│   │   ├── useOllama.ts            # Debounced AI call, prompt construction, response parsing
│   │   └── useSettings.ts          # Load/save settings via Tauri store plugin
│   ├── lib/
│   │   ├── annotation-positioner.ts  # coordsAtPos() logic, scroll-aware y-offset computation
│   │   ├── prompt-templates.ts       # Ollama prompt strings for each annotation type
│   │   ├── text-utils.ts             # Char offset ↔ line/col conversion, anchor validation
│   │   └── db.ts                     # Tauri SQL plugin wrapper, typed query helpers
│   ├── types/
│   │   └── index.ts                  # All shared TypeScript interfaces (see Data Model below)
│   ├── App.tsx                       # Root: layout, routing between editor/settings views
│   └── main.tsx                      # React entry point
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                   # Tauri app entry, plugin registration
│   │   ├── commands/
│   │   │   ├── fs.rs                 # file_read, file_write, list_dir, watch_workspace
│   │   │   └── ollama.rs             # generate_annotation (proxies Ollama to avoid CORS)
│   │   └── lib.rs                    # Command registration, app builder
│   ├── migrations/
│   │   ├── 001_init.sql              # Core schema: files, annotations
│   │   └── 002_settings.sql          # Settings table
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/
│   └── fonts/                        # Caveat font files (self-hosted for offline use)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── CLAUDE.md
└── IMPLEMENTATION-ROADMAP.md
```

---

### Data Model

```sql
-- 001_init.sql

-- Tracks every file seen in the workspace
CREATE TABLE files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    path        TEXT NOT NULL UNIQUE,           -- Absolute path on disk
    name        TEXT NOT NULL,                  -- Filename only (for display)
    last_opened DATETIME,
    word_count  INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_files_path ON files(path);

-- Every AI-generated annotation, accepted or dismissed
CREATE TABLE annotations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id         INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK(type IN ('clarify','expand','simplify','question','alternative')),
    body            TEXT NOT NULL,              -- The annotation text from Ollama
    start_offset    INTEGER NOT NULL,           -- Char offset in file content (anchor start)
    end_offset      INTEGER NOT NULL,           -- Char offset in file content (anchor end)
    anchor_text     TEXT NOT NULL,              -- Snapshot of the anchored text (for validation)
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','dismissed')),
    model_used      TEXT NOT NULL,              -- e.g. 'llama3.2:3b'
    latency_ms      INTEGER,                    -- Ollama response latency (for quality tracking)
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_annotations_file    ON annotations(file_id);
CREATE INDEX idx_annotations_status  ON annotations(status);
CREATE INDEX idx_annotations_type    ON annotations(type);

-- 002_settings.sql

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Seed defaults
INSERT INTO settings (key, value) VALUES
    ('ollama_endpoint',    'http://localhost:11434'),
    ('ollama_model',       'llama3.2:3b'),
    ('annotation_density', '2'),   -- 0=off, 1=occasional, 2=normal, 3=frequent
    ('debounce_ms',        '2500'),
    ('last_workspace',     '');
```

---

### TypeScript Interfaces

```typescript
// src/types/index.ts

export type AnnotationType = 'clarify' | 'expand' | 'simplify' | 'question' | 'alternative';
export type AnnotationStatus = 'pending' | 'accepted' | 'dismissed';

export interface WorkspaceFile {
  id: number;
  path: string;
  name: string;
  lastOpened: string | null;
  wordCount: number;
}

export interface Annotation {
  id: number;
  fileId: number;
  type: AnnotationType;
  body: string;
  startOffset: number;
  endOffset: number;
  anchorText: string;
  status: AnnotationStatus;
  modelUsed: string;
  latencyMs: number | null;
  createdAt: string;
}

// Annotation enriched with pixel position for SVG rendering
export interface PositionedAnnotation extends Annotation {
  yPx: number;       // Top of annotation card in pixels (from editor top)
  visible: boolean;  // Whether anchor is in current scroll viewport
}

export interface WorkspaceSettings {
  ollamaEndpoint: string;
  ollamaModel: string;
  annotationDensity: 0 | 1 | 2 | 3;
  debounceMs: number;
  lastWorkspace: string;
}

export interface OllamaAnnotationRequest {
  fullText: string;        // Entire document content
  anchorText: string;      // The specific passage to annotate
  startOffset: number;
  endOffset: number;
  annotationType: AnnotationType;
  model: string;
}

export interface OllamaAnnotationResponse {
  body: string;
  latencyMs: number;
}

// Tauri command payloads
export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}
```

---

### API Contracts

**Ollama (local — no auth, no rate limit)**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `http://localhost:11434/api/generate` | POST | Generate annotation text |
| `http://localhost:11434/api/tags` | GET | List available models (for settings dropdown) |

**POST /api/generate payload:**
```json
{
  "model": "llama3.2:3b",
  "prompt": "[see prompt-templates.ts]",
  "stream": false,
  "options": {
    "temperature": 0.7,
    "num_predict": 120
  }
}
```

**Ollama response — extract `response` field:**
```json
{
  "response": "The annotation text here",
  "done": true
}
```

**Tauri IPC Commands (Rust → TypeScript):**

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `list_dir` | `{ path: string }` | `FileNode[]` | Workspace file tree |
| `read_file` | `{ path: string }` | `string` | File content |
| `write_file` | `{ path: string, content: string }` | `void` | Save accepted annotation |
| `watch_workspace` | `{ path: string }` | event stream | Detect external file changes |

---

### Prompt Templates (`src/lib/prompt-templates.ts`)

Each annotation type gets a distinct system prompt. Keep responses short — 1–2 sentences, max 120 tokens.

```typescript
export const ANNOTATION_PROMPTS: Record<AnnotationType, (anchor: string, context: string) => string> = {
  clarify: (anchor, context) =>
    `You are a writing editor reviewing a markdown document. The writer wrote: "${anchor}"\n\nContext (surrounding text): ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting how to make this passage clearer. Start with "Clarify:" and be specific. Do not repeat the text back.`,

  expand: (anchor, context) =>
    `You are a writing editor reviewing a markdown document. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting what detail, example, or explanation could be added here. Start with "Expand:" and be specific.`,

  simplify: (anchor, context) =>
    `You are a writing editor. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting how to make this simpler or more direct. Start with "Simplify:" and be specific.`,

  question: (anchor, context) =>
    `You are a writing editor. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) raising a question a reader might have. Start with "Question:" and be specific.`,

  alternative: (anchor, context) =>
    `You are a writing editor. The writer wrote: "${anchor}"\n\nContext: ${context.slice(0, 400)}\n\nWrite a short margin note (1-2 sentences, max 30 words) suggesting an alternative phrasing or approach. Start with "Alternative:" and be specific.`,
};
```

---

### Dependencies

```bash
# In project root
npm create tauri-app@latest ink -- --template react-ts
cd ink

# Frontend core
npm install @codemirror/view @codemirror/state @codemirror/lang-markdown
npm install @codemirror/commands @codemirror/language @codemirror/basic-setup

# Tauri plugins (add to src-tauri/Cargo.toml too)
npm install @tauri-apps/plugin-sql
npm install @tauri-apps/plugin-store
npm install @tauri-apps/plugin-fs
npm install @tauri-apps/plugin-dialog

# Dev
npm install -D tailwindcss autoprefixer postcss
npx tailwindcss init -p
```

**src-tauri/Cargo.toml additions:**
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-store = "2"
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json", "blocking"] }
tokio = { version = "1", features = ["full"] }
```

---

## Scope Boundaries

**In scope (all phases):**
- Workspace folder open/browse/select files
- CodeMirror 6 Markdown editor with live split-pane preview
- SVG margin annotation overlay with scroll-aware positioning
- 5 annotation types: clarify, expand, simplify, question, alternative
- Accept/dismiss interactions (accept inserts suggestion at anchor)
- Annotation density slider (off → occasional → normal → frequent)
- SQLite persistence for all annotations with status tracking
- Settings: Ollama endpoint, model, debounce delay
- Annotation history view per file

**Out of scope (never build these):**
- Cloud sync or remote storage of any kind
- Multi-user collaboration
- Non-Markdown file types
- Annotation export to third-party apps
- Real-time collaborative editing

**Deferred (Phase 3+):**
- Global annotation stats dashboard (acceptance rate, type breakdown)
- Keyboard shortcuts (⌘K accept, ⌥D dismiss)
- Annotation search across workspace
- Custom annotation type creation
- Model fine-tuning or prompt customization UI

---

## Security & Credentials

- **Ollama endpoint**: Stored in SQLite `settings` table via Tauri store plugin — not in `.env`
- **Data boundaries**: Nothing leaves the machine. Ollama runs locally. No telemetry.
- **File access**: Scoped to the opened workspace folder via Tauri allowlist in `tauri.conf.json`
- **No secrets**: ink has no API keys. Ollama is unauthenticated local HTTP.
- **File writes**: Only on explicit user action (accept annotation, manual save). Never auto-save.

---

## Phase 0: Foundation (Week 1)

**Objective:** Scaffolded Tauri 2 + React + TypeScript project with working SQLite schema, Ollama connectivity check, and workspace folder open. No editor, no annotations yet.

**Tasks:**
1. Scaffold Tauri 2 app with `npm create tauri-app` using `react-ts` template — **Acceptance:** `npm run tauri dev` launches a blank window with no errors in console or Rust output.
2. Configure Tailwind CSS — **Acceptance:** A `bg-gray-900 text-white` div renders correctly in the dev window.
3. Add `tauri-plugin-sql` and run migrations `001_init.sql` + `002_settings.sql` on app startup — **Acceptance:** `sqlite3 ~/Library/Application\ Support/ink/ink.db .tables` shows `files`, `annotations`, `settings` tables with seed rows in `settings`.
4. Implement `list_dir` Tauri command (Rust) + `useWorkspace.ts` hook — **Acceptance:** Open a test folder; `console.log` of `FileNode[]` tree shows correct recursive structure.
5. Implement `read_file` Tauri command — **Acceptance:** Select a `.md` file from the tree; its raw content logs to console.
6. Implement Ollama connectivity check — hit `GET /api/tags` on app startup, surface status in a `<StatusBar>` component — **Acceptance:** Status bar shows "Ollama: connected (llama3.2:3b)" when Ollama is running, "Ollama: offline" when not.

**Verification checklist:**
- [ ] `npm run tauri dev` → blank window, zero console errors
- [ ] `sqlite3 ~/Library/Application\ Support/ink/ink.db "SELECT * FROM settings;"` → 5 rows with defaults
- [ ] Open `/Users/saagar/Documents` → FileNode tree logs to console with correct structure
- [ ] Status bar shows correct Ollama state (test both online/offline)

**Risks:**
- `tauri-plugin-sql` v2 migration API: check docs for correct plugin registration syntax — Mitigation: read tauri-plugin-sql v2 changelog before writing any migration code → Fallback: use `tauri::command` + raw rusqlite if plugin API is unclear.

---

## Phase 1: Editor + File Tree (Week 2)

**Objective:** Working Markdown editor with sidebar file tree. Open files, edit content, save. Split-pane preview. No annotations yet — validate the core editor UX first.

**Tasks:**
1. Build `WorkspaceSidebar` component: folder tree with expand/collapse, `.md` file highlight, active file indicator — **Acceptance:** Click a `.md` file → it becomes active (highlighted), name shows in title bar.
2. Integrate CodeMirror 6 in `EditorPane.tsx`: `@codemirror/lang-markdown`, basic theme, line numbers — **Acceptance:** Open a `.md` file → content loads in CM6 editor, typing works, cursor position visible.
3. Implement split-pane live preview (editor left, rendered Markdown right) using `marked` or `remark` — **Acceptance:** Type `# Hello` in editor → right pane shows `<h1>Hello</h1>` within 100ms.
4. Implement `write_file` Tauri command + `⌘S` save — **Acceptance:** Edit content, press `⌘S`, reopen file in any text editor → changes persisted to disk.
5. Insert `files` row in SQLite on first open, update `last_opened` + `word_count` on every save — **Acceptance:** `SELECT * FROM files;` after opening 3 files shows 3 rows with correct paths and word counts.
6. Implement scroll sync: editor scroll position drives preview scroll — **Acceptance:** Scroll to bottom of a 500-word doc in the editor → preview scrolls proportionally.

**Verification checklist:**
- [ ] Open workspace → file tree renders with correct hierarchy
- [ ] Open 3 different `.md` files → each loads correctly, no content bleed between files
- [ ] Edit + `⌘S` → `cat [filepath]` in terminal confirms disk write
- [ ] `SELECT path, word_count FROM files;` → correct word counts
- [ ] 500-word doc scroll test passes

**Risks:**
- CM6 scroll sync with preview: CM6 exposes `scrollDOM` — sync by percentage of scrollHeight, not line numbers — Mitigation: implement as `scrollDOM.scrollTop / scrollDOM.scrollHeight * previewEl.scrollHeight` → Fallback: skip scroll sync, defer to Phase 3.

---

## Phase 2: Annotation Engine (Weeks 3–4)

**Objective:** The core product. Annotations appear in the SVG overlay as handwritten-style notes. Ollama generates them. Accept/dismiss works. This is the spike phase.

### 2a: SVG Annotation Positioning (Week 3 — SPIKE FIRST)

**Tasks:**
1. **Positioning spike**: Render a single static annotation at a hardcoded `startOffset` using `EditorView.coordsAtPos()`. Get the y-pixel coordinate, render a colored SVG `<rect>` at that position in an overlay div — **Acceptance:** A yellow box appears at the correct vertical position next to the anchored text. Scroll the editor — the box moves correctly. This must work before any Ollama integration.
2. Build `AnnotationOverlay.tsx`: absolute-positioned SVG layer over the editor, z-index above editor but below scrollbars — **Acceptance:** SVG layer does not block editor interaction (typing, selecting, scrolling still work).
3. Build `AnnotationCard.tsx`: SVG `<foreignObject>` containing a styled card with type badge (color-coded), annotation body in Caveat font, accept/dismiss buttons — **Acceptance:** Card renders at correct y-position, text is legible in Caveat font.
4. Implement scroll-aware re-positioning: attach CM6 `EditorView.domEventHandlers({ scroll })` + `ResizeObserver` on editor container — on each scroll/resize event, recompute `coordsAtPos()` for all pending annotations and update SVG positions — **Acceptance:** Open a doc with 10 static annotations across the document; scroll through it — all annotations track correctly with zero jitter.
5. Implement visibility clipping: annotations whose anchor is scrolled out of view are hidden (`visible: false`), not just off-screen — **Acceptance:** Scroll past annotation anchor → card disappears; scroll back → card reappears.

### 2b: Ollama Integration (Week 4)

**Tasks:**
6. Implement `useOllama.ts`: 2500ms debounce after last keypress → select annotation trigger range (nearest sentence or paragraph around cursor) → call Ollama via `generate_annotation` Tauri command → parse response → store in SQLite — **Acceptance:** Type for 5 seconds, stop — within 3000ms a new annotation appears in SQLite and in the SVG overlay.
7. Implement annotation type selection strategy: rotate through types based on `annotation_density` setting and annotation history for this file (don't repeat same type 3x in a row) — **Acceptance:** Write 200 words, stop repeatedly — annotations cycle through multiple types.
8. Implement accept action: clicking accept inserts `annotation.body` text at `startOffset` in the editor, updates SQLite `status = 'accepted'`, removes card from overlay — **Acceptance:** Accept a suggestion → text inserted at correct position, word count increases, card gone.
9. Implement dismiss action: clicking dismiss sets `status = 'dismissed'`, removes card — **Acceptance:** Dismiss 5 annotations → `SELECT COUNT(*) FROM annotations WHERE status='dismissed';` returns 5.
10. Implement annotation density control in `SettingsPanel`: slider 0–3 controls debounce aggressiveness and max simultaneous pending annotations (0=off, 1=1 max, 2=3 max, 3=5 max) — **Acceptance:** Set density to 0, type for 30 seconds — no annotations generated.

**Verification checklist:**
- [ ] Positioning spike: yellow box tracks anchor through scroll — zero off-by-one errors
- [ ] Type 200 words, pause — annotation appears within 3000ms
- [ ] Accept annotation → text inserted at correct position, no extra whitespace
- [ ] Density slider at 0 → no annotations generated
- [ ] `SELECT type, COUNT(*), AVG(latency_ms) FROM annotations GROUP BY type;` runs and returns data

**Risks:**
- `coordsAtPos()` returns `null` for offscreen positions: Always null-check; skip positioning for out-of-viewport annotations — Mitigation: use the `visible` flag to gate rendering → Fallback: implement a simpler line-number-based positioning fallback if `coordsAtPos` proves unreliable.
- Ollama 3b model quality: test on real writing samples early in Week 4. If output is consistently poor — Mitigation: switch default to `qwen2.5:7b` and update `settings` seed value → Fallback: ship a "model quality" note in README, make model switching the first thing users configure.
- SVG `<foreignObject>` rendering bugs on macOS WebView: test in Tauri WebView early — Mitigation: have a pure SVG `<text>` fallback if `foreignObject` fails.

---

## Phase 3: Polish + Annotation History (Week 5–6)

**Objective:** ink is a daily-use tool. This phase adds the quality-of-life features that make it feel finished.

**Tasks:**
1. Annotation history panel: collapsible drawer showing all annotations for the current file, grouped by status (pending/accepted/dismissed), sortable by date — **Acceptance:** Open history drawer → see all annotations; click an annotation → editor scrolls to its anchor.
2. `StatusBar` completion: word count, annotation count (pending/accepted today), Ollama model name, latency (last call in ms) — **Acceptance:** All 4 data points update live as user writes.
3. Keyboard shortcuts: `⌘↵` accept focused annotation, `⌥D` dismiss, `⌘,` open settings — **Acceptance:** All 3 shortcuts work from within the editor without leaving keyboard home row.
4. Error states: Ollama offline banner, file permission errors, SQLite write failures — all surface in StatusBar or toast, never silently fail — **Acceptance:** Kill Ollama process mid-session → "Ollama offline" appears within 5 seconds; restart Ollama → status updates within 10 seconds.
5. Empty states: new workspace (no files), file with zero annotations yet, all annotations dismissed — each has a meaningful message — **Acceptance:** Open empty folder → see "Open a Markdown file to start writing" with folder icon.
6. Performance: open a 10,000-word `.md` file, scroll through it with 20 pending annotations — no jank — **Acceptance:** `requestAnimationFrame` timestamps during scroll show < 16ms frame budget maintained.

**Verification checklist:**
- [ ] History panel shows all 3 status groups; click-to-scroll works
- [ ] Kill Ollama → banner appears < 5s; restart → clears < 10s
- [ ] 10,000-word file scroll test: no visible jank
- [ ] All keyboard shortcuts work from editor focus
- [ ] `SELECT COUNT(*), status FROM annotations GROUP BY status;` matches history panel counts

---

## Testing Strategy

### Phase 0
- Manual: verify SQLite tables exist and `settings` seed rows are correct
- Manual: Ollama status indicator flips correctly on connectivity change

### Phase 1
- Manual: open 5 different `.md` files, verify no content bleed
- Manual: save cycle (edit → `⌘S` → `cat` → confirm)
- Unit test: `wordCount(content: string): number` in `text-utils.ts` — test with empty string, single word, 500 words, Unicode

### Phase 2
- **Spike acceptance test**: yellow rect tracks scroll — hardcoded, no Ollama
- Unit test: `getAnchorRange(content: string, cursorOffset: number): { start: number, end: number }` — test with cursor at start, middle, end of sentence; cursor in heading vs body
- Unit test: all 5 prompt template functions — verify output contains correct `AnnotationType` prefix
- Manual: accept/dismiss cycle → verify SQLite rows update correctly
- Manual: density slider at each level → verify annotation rate changes

### Phase 3
- Manual: history panel count matches `SELECT COUNT(*)` by status
- Performance: DevTools flame chart during 10k-word scroll — no frame > 16ms
- Manual: error state coverage (kill Ollama, revoke file permission, fill disk)
