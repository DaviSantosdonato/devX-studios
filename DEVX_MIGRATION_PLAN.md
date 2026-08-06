# DevX Studio Migration Plan

> Migration from Bolt.new (StackBlitz) to DevX Studio — comprehensive analysis and phased migration strategy.

---

## 1. Architecture Overview

### Current Stack
- **Framework**: Remix v2 (React 18) on Cloudflare Workers/Pages
- **State Management**: Nanostores (atom/map/computed)
- **Styling**: UnoCSS with custom design tokens (`bolt-elements-*` CSS variables)
- **AI Integration**: Vercel AI SDK v3 + Anthropic Claude 3.5 Sonnet
- **Runtime**: WebContainer API (`@webcontainer/api@1.3.0-internal.10`) for in-browser Node.js
- **Editor**: CodeMirror 6 with custom extensions
- **Terminal**: xterm.js with JSH shell
- **Deployment**: Cloudflare Pages + Workers (`wrangler.toml`)
- **Package Manager**: pnpm 9.4.0

### Key Architectural Patterns
- **Client-only WebContainer**: Booted in `app/lib/webcontainer/index.ts` (SSR-safe via `import.meta.env.SSR` guard)
- **Store-centric**: Central `WorkbenchStore` (`app/lib/stores/workbench.ts`) orchestrates Files, Editor, Terminal, Previews, Artifacts
- **Streaming Parser**: `StreamingMessageParser` (`app/lib/runtime/message-parser.ts`) parses `<boltArtifact>`/`<boltAction>` tags in real-time
- **Action Runner**: `ActionRunner` (`app/lib/runtime/action-runner.ts`) executes shell/file actions sequentially in WebContainer
- **Persistence**: IndexedDB for chat history (`app/lib/persistence/db.ts`)

---

## 2. Main Frontend & Backend Files

### Frontend Entry Points
| File | Purpose |
|------|---------|
| `app/entry.client.tsx` | Client hydration (`RemixBrowser`) |
| `app/entry.server.tsx` | SSR with `renderToReadableStream`, COEP/COOP headers for WebContainer |
| `app/root.tsx` | Global layout, theme, fonts, UnoCSS, links |
| `app/routes/_index.tsx` | Main route: Header + Chat (client-only) |
| `app/routes/chat.$id.tsx` | Chat history route (loads previous conversations) |

### Core UI Components
| File | Purpose |
|------|---------|
| `app/components/chat/Chat.client.tsx` | Main chat orchestrator: `useChat`, `useMessageParser`, `usePromptEnhancer`, history |
| `app/components/chat/BaseChat.tsx` | Static chat UI (placeholder, input, examples) |
| `app/components/chat/Messages.client.tsx` | Message rendering with streaming support |
| `app/components/chat/Artifact.tsx` | Artifact display with action list (shell/file) |
| `app/components/workbench/Workbench.client.tsx` | Code/Preview/Terminal panels, file tree, editor |
| `app/components/workbench/EditorPanel.tsx` | CodeMirror editor + file breadcrumb + terminal |
| `app/components/workbench/Preview.tsx` | Iframe preview with port dropdown |
| `app/components/workbench/FileTree.tsx` | File explorer with drag/drop |
| `app/components/header/Header.tsx` | Top bar: logo, chat title, action buttons |
| `app/components/sidebar/Menu.client.tsx` | Left sidebar: history, new chat, theme toggle |

### Backend (Server) Routes
| File | Purpose |
|------|---------|
| `app/routes/api.chat.ts` | Main chat endpoint: streams Anthropic responses, handles continuation |
| `app/routes/api.enhancer.ts` | Prompt enhancement endpoint (improves user prompts) |
| `functions/[[path]].ts` | Cloudflare Pages Functions handler (Remix server build) |

### Core Libraries
| File | Purpose |
|------|---------|
| `app/lib/webcontainer/index.ts` | WebContainer boot singleton (HMR-safe) |
| `app/lib/stores/workbench.ts` | Central store: files, editor, terminal, previews, artifacts, actions |
| `app/lib/stores/files.ts` | File system watcher → FileMap sync with WebContainer |
| `app/lib/stores/editor.ts` | Editor documents, selection, scroll position |
| `app/lib/stores/terminal.ts` | Terminal spawning (JSH), resize handling |
| `app/lib/stores/previews.ts` | Port forwarding watcher (dev server URLs) |
| `app/lib/stores/chat.ts` | Chat UI state (started, aborted, showChat) |
| `app/lib/stores/settings.ts` | User settings (theme, etc.) |
| `app/lib/runtime/message-parser.ts` | Streaming parser for `<boltArtifact>`/`<boltAction>` |
| `app/lib/runtime/action-runner.ts` | Sequential action execution in WebContainer |
| `app/lib/.server/llm/stream-text.ts` | AI SDK streamText wrapper with Anthropic model |
| `app/lib/.server/llm/prompts.ts` | **System prompt** (defines Bolt persona, WebContainer constraints, artifact format) |
| `app/lib/.server/llm/model.ts` | Anthropic model factory |
| `app/lib/.server/llm/api-key.ts` | API key resolution (env + Cloudflare) |
| `app/lib/persistence/db.ts` | IndexedDB chat history CRUD |
| `app/lib/hooks/useMessageParser.ts` | React hook bridging parser → workbenchStore |

---

## 3. AI Providers Location

### Current: Anthropic Only (Claude 3.5 Sonnet)

| File | Role |
|------|------|
| `app/lib/.server/llm/model.ts` | `createAnthropic` → `anthropic('claude-3-5-sonnet-20240620')` |
| `app/lib/.server/llm/stream-text.ts` | Calls `getAnthropicModel(getAPIKey(env))` |
| `app/lib/.server/llm/api-key.ts` | Reads `ANTHROPIC_API_KEY` from `process.env` or Cloudflare env |
| `app/lib/.server/llm/constants.ts` | `MAX_TOKENS=8192`, `MAX_RESPONSE_SEGMENTS=2` |
| `app/lib/.server/llm/prompts.ts` | **System prompt** hardcodes "You are Bolt..." and WebContainer constraints |

### To Support Multiple Providers
- Extract provider factory to `app/lib/.server/llm/providers/` (e.g., `anthropic.ts`, `openai.ts`, `google.ts`)
- Add provider selection in settings store → pass to `streamText`
- Update system prompt to be provider-agnostic (remove "You are Bolt" references)

---

## 4. WebContainer Usage

### Boot & Lifecycle
- **File**: `app/lib/webcontainer/index.ts`
- **Boot**: `WebContainer.boot({ workdirName: 'project' })` → mounts at `/home/project`
- **Singleton**: Stored in `import.meta.hot.data.webcontainer` for HMR survival
- **SSR Guard**: Only boots client-side (`!import.meta.env.SSR`)

### File System Operations
- **File**: `app/lib/stores/files.ts`
- **Watch**: `webcontainer.internal.watchPaths({ include: ['/home/project/**'], exclude: ['**/node_modules', '.git'], includeContent: true })`
- **Read/Write**: `webcontainer.fs.writeFile(relativePath, content)`, `webcontainer.fs.readFile()`
- **Sync**: Events → `FilesStore.files` (nanostore MapStore)

### Shell/Process Execution
- **File**: `app/lib/runtime/action-runner.ts` → `#runShellAction()`
- **Spawn**: `webcontainer.spawn('jsh', ['-c', command], { env: { npm_config_yes: true } })`
- **Terminal**: `app/utils/shell.ts` → `webcontainer.spawn('/bin/jsh', ['--osc'], { terminal: { cols, rows } })`

### Port Forwarding / Previews
- **File**: `app/lib/stores/previews.ts`
- **Event**: `webcontainer.on('port', (port, type, url) => ...)` → tracks open/close
- **UI**: `PortDropdown.tsx` shows active ports, `Preview.tsx` iframes the URL

### Key Constants
- `app/utils/constants.ts`: `WORK_DIR = '/home/project'`, `WORK_DIR_NAME = 'project'`

---

## 5. Bolt Branding Locations (All Must Be Replaced)

### Visual Assets
| Path | Type |
|------|------|
| `icons/logo.svg` | 16×16 app icon (blue square + lightning) |
| `icons/logo-text.svg` | "Bolt" wordmark (SVG path) |
| `icons/chat.svg` | Chat bubble icon (sidebar "Start new chat") |
| `icons/stars.svg` | Sparkle icon (empty state loader) |
| `public/favicon.svg` | Favicon (likely same as logo.svg) |
| `public/logo.svg` | Public logo |
| `public/social_preview_index.jpg` | OG image (600KB) |

### CSS Design Tokens (UnoCSS Config)
**File**: `uno.config.ts` — **entire `bolt:` color namespace** (lines 117–227)
```ts
bolt: {
  elements: {
    borderColor: 'var(--bolt-elements-borderColor)',
    background: { depth: { 1: 'var(--bolt-elements-bg-depth-1)', ... } },
    textPrimary: 'var(--bolt-elements-textPrimary)',
    // ... 100+ token mappings
  }
}
```
Used everywhere via classes like `bg-bolt-elements-background-depth-1`, `text-bolt-elements-textPrimary`.

### Component References
| File | Bolt References |
|------|-----------------|
| `app/components/header/Header.tsx` | `i-bolt:logo-text?mask`, `i-bolt:chat` |
| `app/components/sidebar/Menu.client.tsx` | `i-bolt:chat`, "Start new chat", "Your Chats" |
| `app/components/chat/BaseChat.tsx` | `placeholder="How can Bolt help you today?"`, `i-bolt:stars` |
| `app/components/chat/Artifact.tsx` | "Click to open Workbench" |
| `app/routes/_index.tsx` | Meta title: `'Bolt'`, description: `'Talk with Bolt, an AI assistant from StackBlitz'` |

### System Prompt (Critical)
**File**: `app/lib/.server/llm/prompts.ts` (lines 6–7, 88–90, 112, 153–155, 172–173, 191–192, 210–211, 229–230)
- "You are **Bolt**, an expert AI assistant..."
- "Bolt creates a SINGLE, comprehensive artifact..."
- `<boltArtifact>` / `<boltAction>` tag names (hardcoded in parser too)
- Examples all reference "Bolt"

### Parser Tag Names
**File**: `app/lib/runtime/message-parser.ts` (lines 6–9)
```ts
const ARTIFACT_TAG_OPEN = '<boltArtifact';
const ARTIFACT_TAG_CLOSE = '</boltArtifact>';
const ARTIFACT_ACTION_TAG_OPEN = '<boltAction';
const ARTIFACT_ACTION_TAG_CLOSE = '</boltAction>';
```

### Types
| File | Bolt Types |
|------|------------|
| `app/types/artifact.ts` | `BoltArtifactData` |
| `app/types/actions.ts` | `BoltAction`, `BoltActionData` |

### Documentation
| File | References |
|------|------------|
| `README.md` | 20+ "Bolt"/"Bolt.new" mentions |
| `CONTRIBUTING.md` | 30+ "Bolt" mentions, explains Bolt vs Bolt.new |
| `package.json` | `"name": "bolt"`, `"description": "StackBlitz AI Agent"` |

---

## 6. Migration Risks for DevX Studio

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **System Prompt Coupling** | AI behavior hardcoded to "Bolt" persona, WebContainer constraints, `<boltArtifact>` format | Extract prompt to config; support custom system prompts per provider; abstract artifact tag names |
| **WebContainer API Version** | Uses internal build `1.3.0-internal.10` — may break on upgrade | Pin version; test upgrades in isolation; have fallback to stable release |
| **Cloudflare-Specific Deployment** | `wrangler.toml`, `@remix-run/cloudflare`, `functions/[[path]].ts` — not portable | Abstract deployment target; support Docker/Node/Vercel/Netlify via adapters |
| **IndexedDB Persistence** | Browser-only, not portable to mobile/desktop wrappers | Add abstraction layer (localStorage/OPFS/SQLite); support sync backend |
| **CSS Token Namespace** | 100+ `bolt-elements-*` CSS variables + UnoCSS `bolt:` theme — massive find/replace | Create DevX token map; use UnoCSS `transformers` to alias; automate migration script |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Single AI Provider** | Only Anthropic; no OpenAI, Google, local models | Build provider registry; add `providers/` folder; settings UI for API keys |
| **Hardcoded Workdir** | `/home/project` baked into constants, prompts, WebContainer boot | Make workdir configurable; support multiple projects |
| **Remix Island SSR** | `remix-island` for head rendering — unusual pattern | Document or replace with standard Remix patterns |
| **HMR Store Persistence** | `import.meta.hot.data` used heavily — fragile in non-Vite envs | Add fallback for non-HMR environments; test in production build |
| **JSH Shell Dependency** | Terminal spawns `/bin/jsh` — WebContainer-specific | Abstract shell interface; support bash/zsh via WebContainer features |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Package.json Identity** | `name: "bolt"` — npm conflicts if published | Rename to `@devx/studio` or similar |
| **Favicon/Logo Assets** | Simple SVG swap | Replace in `icons/` + `public/` |
| **Meta Tags** | Route meta functions — easy to update | Update `_index.tsx`, `chat.$id.tsx` |

---

## 7. Recommended Migration Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Fork repo, rename `package.json` (`name`, `description`)
- [ ] Create DevX design tokens (`devx-elements-*`) in `uno.config.ts` alongside Bolt tokens
- [ ] Build automated codemod to replace `bolt-elements-*` → `devx-elements-*` in all `.tsx`/`.css`
- [ ] Replace SVG assets in `icons/` and `public/`
- [ ] Update `wrangler.toml` name, add multi-target deploy scripts

### Phase 2: AI Provider Abstraction (Week 2-3)
- [ ] Create `app/lib/.server/llm/providers/` with `anthropic.ts`, `openai.ts`, `google.ts`, `ollama.ts`
- [ ] Add `ProviderRegistry` + settings store for API keys + model selection
- [ ] Refactor `stream-text.ts` to accept provider config
- [ ] Externalize system prompt to `app/lib/.server/llm/prompts/devx.ts` with template variables
- [ ] Make artifact tag names configurable (`<devxArtifact>`)

### Phase 3: Branding Purge (Week 3)
- [ ] Global search/replace: "Bolt" → "DevX" (UI strings, meta, docs)
- [ ] Rename types: `BoltArtifactData` → `DevXArtifactData`, `BoltAction` → `DevXAction`
- [ ] Update parser tag constants
- [ ] Update `README.md`, `CONTRIBUTING.md` with DevX positioning

### Phase 4: Portability & Persistence (Week 4)
- [ ] Abstract IndexedDB → `StorageAdapter` (IndexedDB, localStorage, OPFS, SQLite/WASM)
- [ ] Make workdir configurable (multi-project support)
- [ ] Add Dockerfile + Node/Express server adapter (non-Cloudflare)
- [ ] Create Vite/Remix config for SPA build (static hosting)

### Phase 5: Advanced Features (Week 5+)
- [ ] Plugin system for custom tools/extensions
- [ ] Collaboration (CRDT/Yjs for shared editing)
- [ ] Mobile/desktop wrappers (Tauri/Electron/Capacitor)
- [ ] Enterprise: SSO, audit logs, custom model endpoints

---

## 8. File Inventory for Automated Migration

### Rename/Move
```
package.json                          → update name, description
wrangler.toml                         → update name
icons/logo.svg                        → replace
icons/logo-text.svg                   → replace
icons/chat.svg                        → replace
icons/stars.svg                       → replace
public/favicon.svg                    → replace
public/logo.svg                       → replace
public/social_preview_index.jpg       → replace
```

### Search/Replace (Codemod Targets)
| Pattern | Replacement | Files |
|---------|-------------|-------|
| `bolt-elements-` | `devx-elements-` | All `.tsx`, `.css`, `uno.config.ts` |
| `i-bolt:` | `i-devx:` | All `.tsx` (Iconify collections) |
| `bolt-elements-` (UnoCSS theme) | `devx-elements-` | `uno.config.ts` |
| `BoltArtifactData` | `DevXArtifactData` | `app/types/artifact.ts`, imports |
| `BoltAction` / `BoltActionData` | `DevXAction` / `DevXActionData` | `app/types/actions.ts`, imports |
| `<boltArtifact` | `<devxArtifact` | `app/lib/runtime/message-parser.ts`, prompts |
| `</boltArtifact>` | `</devxArtifact>` | Same |
| `<boltAction` | `<devxAction` | Same |
| `</boltAction>` | `</devxAction>` | Same |
| `You are Bolt` | `You are DevX` | `app/lib/.server/llm/prompts.ts` |
| `Bolt creates` | `DevX creates` | Same |
| `bolt` (package name) | `devx-studio` | `package.json` |

### Manual Review Required
- `app/lib/.server/llm/prompts.ts` — full rewrite for provider-agnostic prompt
- `app/routes/_index.tsx` — meta title/description
- `app/components/header/Header.tsx` — logo, brand text
- `app/components/sidebar/Menu.client.tsx` — "Start new chat", "Your Chats"
- `app/components/chat/BaseChat.tsx` — placeholder, stars icon
- `README.md` / `CONTRIBUTING.md` — complete rewrite

---

## 9. Verification Checklist

After each phase, verify:
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run dev` starts without errors
- [ ] Chat works: send message → artifact → workbench opens → code runs
- [ ] Terminal spawns, commands execute
- [ ] Preview iframe loads dev server
- [ ] Theme toggle works (light/dark)
- [ ] History sidebar loads/saves conversations
- [ ] Prompt enhancer works
- [ ] File tree: create, edit, delete, rename

---

*Generated from Bolt.new codebase analysis — August 2026*