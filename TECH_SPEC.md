# Ajaia Docs — Technical Specification

> **Status:** Draft v2.0 (planning phase — no code yet)
> **Author:** Candidate
> **Timebox:** 4–6 hours of implementation (per `ASSIGNMENT.md`)
> **Companion documents:**
> - [`HLD.md`](./HLD.md) — the layered, anemic-tactical-DDD architecture this spec is built against.
> - `README.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md`, `SUBMISSION.md` — submission artifacts (generated during build).

---

## 1. Purpose & Background

"Ajaia Docs" is a lightweight, collaborative, rich-text document editor inspired by Google Docs, scoped to a single focused product slice that can be shipped inside the assignment's 4–6 hour timebox.

This spec defines **what** the application must do (functional behavior), **how well** it must do it (non-functional requirements), the **contracts** (data model, REST API, UI flows) that make the behavior testable, and a **module-by-module breakdown** of the backend (which follows an **anemic tactical DDD** style: rich domain *functions* operating on anemic data structures, organized into bounded modules).

The assignment does not require a full Google Docs clone. Per the brief, **depth on a few important axes (editing, sharing, persistence, file import) beats shallow coverage everywhere.** This spec encodes that prioritization explicitly in §11 (Prioritization & Scope Cuts).

---

## 2. Goals & Non-Goals

### 2.1 Goals (in scope)
1. Create, rename, edit, save, and reopen rich-text documents.
2. Rich-text editing with bold, italic, underline, headings, bulleted/numbered lists.
3. File upload that turns `.md` / `.txt` / `.docx` into a new editable document.
4. Sharing model: an owner can grant access to another seeded user; owned vs. shared documents are visually distinct.
5. Persistence that survives refresh and restart, preserving formatting.
6. Light auth via seeded users (fast user-switching for reviewer demo of sharing).
7. At least one meaningful automated test; clear setup (incl. **Docker Compose**); a deployed, reviewable URL.
8. Submission artifacts (README, architecture note, AI-workflow note, SUBMISSION.md, walkthrough video).

### 2.2 Non-Goals (deliberately out of scope)
- **No real-time multiplayer cursors / concurrent editing.** (Stretch only; not committed.) *However*, the backend's concurrency core is structured as pure functions so a future realtime layer could reuse it.
- **No email/password auth, OAuth, or session security.** Identity is simulated with seeded users and a header/cookie selector. This is an explicit, documented scope cut.
- **No fine-grained RBAC** (viewer/commenter/editor/admin). Only `owner` vs `editor` for the core build.
- **No document version history**, comments, or suggestion mode in v1.
- **No image embedding inside documents.** Uploaded files are *imported as text content*, not attached.
- **No offline / PWA support.**
- **No mobile-optimized layout.** Desktop-first.

---

## 3. Personas & Roles

| Persona | How realized | Used for |
|---|---|---|
| **Owner** | The user who created a document. Stored on `Document.ownerId`. | Full control incl. delete, rename, share. |
| **Editor (shared user)** | A user added via a share grant. `Share.granteeId` + `role = 'EDITOR'`. | Can edit content + title; cannot delete or re-share. |
| **Visitor (not shared)** | Any other seeded user, or anonymous. | Sees "Access denied" on direct document URLs. |

Auth is **simulated**: the frontend user-switcher writes a `ajaia_user` cookie; the client sends it as the `X-User-Id` request header. There are 3 seeded users so reviewers can demonstrate sharing between two distinct identities without creating accounts.

> **Security note (deliberate limitation):** because auth is simulated, this is **not** a production-grade access-control system. The sharing *logic* (owner vs. shared, denial for non-grantees) is real and tested; the *identity assertion* is mocked. See `AI_WORKFLOW.md` and `ARCHITECTURE.md`.

---

## 4. Functional Requirements

Each requirement has a stable ID (`FR-x.y`), MoSCoW priority (`M`/`S`/`C`), and an acceptance criterion. IDs are referenced by tests and the HLD.

### 4.1 Documents — creation & lifecycle

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-1.1 | Create a new, empty document from the document list. | M | Clicking "New" creates a doc owned by the current user and opens the editor with an empty body. |
| FR-1.2 | Rename a document from the editor (title field) and the list. | M | Renaming persists across refresh; the list updates immediately. |
| FR-1.3 | Edit rich-text content in the editor. | M | Typing into the editor updates the document body and is persisted on save. |
| FR-1.4 | Save explicitly and auto-save on idle. | M | `Ctrl/Cmd+S` and a Save button both write to the server; debounced auto-save (~1.5s idle) persists. A "Saved"/"Saving…" indicator reflects state. |
| FR-1.5 | Reopen a previously saved document; see prior content + formatting. | M | After full refresh + re-login as the same user, content and formatting are block-level identical. |
| FR-1.6 | The owner can delete a document. | M | Delete removes the doc and all its share grants; it disappears from every list. |
| FR-1.7 | Shared editors cannot delete or rename-to-empty. | S | Editor role gets 403 on delete; empty title reverts to "Untitled". |

### 4.2 Rich-text editing

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-2.1 | Bold, italic, underline via toolbar + shortcuts (`Ctrl/Cmd+B/I/U`). | M | Selection becomes bold/italic/underlined; toolbar state reflects active formats at caret. |
| FR-2.2 | Headings (H1, H2, H3) and paragraph styles. | M | A paragraph converts to H1/H2/H3 and back; rendered with visually distinct sizes. |
| FR-2.3 | Bulleted/numbered lists, nestable one level. | M | Toggle creates `<ul>`/`<ol>`; Tab/Shift+Tab changes nesting by one level. |
| FR-2.4 | No arbitrary HTML injection (sanitized input). | S | Pasting `<script>` produces literal text or is stripped — never executes. |

### 4.3 File upload / import

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-3.1 | Upload `.md`, `.txt`, or `.docx` from the document list ("Import"). | M | Accepted types are listed in the UI; rejected types show a clear "unsupported" message. |
| FR-3.2 | An uploaded file becomes a **new** editable document owned by the uploader. | M | After upload, a new doc appears, opened in the editor, body = parsed file content. |
| FR-3.3 | `.md` is parsed into rich-text blocks (headings, lists, bold/italic). | M | A markdown file with `# H1`, `- item`, `**bold**` renders as native rich text. |
| FR-3.4 | `.txt` is imported as plain paragraphs. | M | Multi-paragraph `.txt` becomes multiple `<p>` blocks. |
| FR-3.5a | `.docx` is parsed to rich-text blocks (headings, lists, bold/italic/underline). | S | A simple `.docx` imports as editable rich text; complex tables/images dropped gracefully. |
| FR-3.6 | Upload size capped (default 2 MB); over-limit rejected with a clear message. | M | A >2 MB file is rejected before parsing with a 413-style message. |

### 4.4 Sharing

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-4.1 | Every document has exactly one owner (the creator). | M | `Document.ownerId` is non-null and immutable post-creation. |
| FR-4.2 | The owner can grant `editor` access to another seeded user via a "Share" dialog. | M | Selecting a user + Save creates a `shares` row; that user now sees the doc in "Shared with me". |
| FR-4.3 | Owned and shared documents are visually distinct. | M | Two clearly labeled sections / badges: "My documents" vs "Shared with me". |
| FR-4.4 | A non-owner, non-grantee cannot open or edit a document. | M | Direct navigation to `/docs/<id>` returns 403; UI shows "Access denied". |
| FR-4.5 | The owner can revoke access (remove a grantee). | S | Removing a grantee deletes the share row; the doc disappears from that user's shared list. |
| FR-4.6 | Shared editors can edit content but cannot re-share or delete. | S | Editor sees no "Share"/"Delete" controls; backend returns 403 if attempted. |

### 4.5 Auth (simulated)

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-5.1 | The app seeds ≥3 users on first run. | M | `/api/health` or the user-switcher shows Alice, Bob, Carol. |
| FR-5.2 | The current user can be switched; the choice persists in a cookie. | M | Switching user changes which docs are visible, surviving refresh. |
| FR-5.3 | All document/share mutations require a valid current user. | M | Requests without `X-User-Id` (or with an unknown id) are rejected with 401. |

### 4.6 Persistence

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-6.1 | Documents, shares, and users are persisted to a durable store. | M | Restarting the server process preserves all data. |
| FR-6.2 | Formatting/structure is preserved across save→reopen. | M | Round-trip a doc with all rich-text types; structure is identical. |
| FR-6.3 | Sharing state is durable. | M | Grant access, restart server, log in as grantee — doc still accessible. |

### 4.7 Observability (new in v2)

| ID | Requirement | Pri | Acceptance |
|---|---|---|---|
| FR-7.1 | Every request gets a correlation id; logs include it. | M | A `X-Request-Id` (generated if absent) propagates through the request lifecycle; every pino log line for that request carries `reqId`. |
| FR-7.2 | Structured logs (JSON) are written to stdout. | M | `docker compose logs api` shows JSON lines with `level`, `time`, `reqId`, `userId`, `msg`, `durationMs`. |
| FR-7.3 | `/api/health` reports DB reachability and seed count. | M | Returns `{ ok, db: 'ok'|'error', seededUsers }`. |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement | Target / Measure |
|---|---|---|---|
| NFR-1 | Performance | Editor input feels immediate; saves don't block typing. | Keystroke→paint < 16 ms (local). Save is async; UI never blocks on it. |
| NFR-2 | Performance | Document list and open load quickly. | < 500 ms server response at p95 for < 100 docs. |
| NFR-3 | Reliability | Save failures are surfaced, not silently lost. | Save error shows a non-blocking toast + retry; last-known-good content stays in the editor. |
| NFR-4 | Security | No XSS via document content or filenames. | Rich-text output is sanitized; `<script>` never reaches the DOM as executable. |
| NFR-5 | Security | Authorization enforced server-side. | Every doc read/write checks ownership-or-share; tested. |
| NFR-6 | Maintainability | Typed, linted, formatted. | TypeScript `strict`; ESLint + Prettier run clean; `npm run build` passes. |
| NFR-7 | Testability | ≥1 meaningful automated test in CI. | `npm test` green; covers authorization and/or import. |
| NFR-8 | Deployability | Free-tier deployable; live URL for reviewers. | One-command build/start; Docker Compose for local; reviewers pay $0. |
| NFR-9 | Accessibility | Core flows keyboard-operable. | Create/open/save/share reachable without mouse; toolbar buttons have `aria-label`s. |
| NFR-10 | Browsers | Current Chrome/Edge/Firefox/Safari. | Tested primarily on Chromium-based. |
| NFR-11 | **Code structure** | Backend follows an **anemic tactical DDD** layering; core logic in **pure functions**. | Domain rules (authz, merge, sanitize) are pure, side-effect-free, and unit-tested in isolation. |
| NFR-12 | **Observability** | Correlated, structured logs via **pino + AsyncLocalStorage**. | One `reqId` per request; logs flow across all layers without explicit threading. |
| NFR-13 | **HTTP clients** | FE uses **axios + TanStack Query**; BE uses **axios** for outbound calls. | Documented in §6 and the module breakdown (§13). |

---

## 6. Technology Stack

| Layer | Choice | Why (1 line) |
|---|---|---|
| **Monorepo layout** | Single repo, pnpm workspaces: `apps/web`, `apps/api`, shared `packages/shared`. | One install, one CI, shared TS types and zod schemas. |
| **Language** | TypeScript (strict) end-to-end. | Type-share API contracts; fewer runtime errors under time pressure. |
| **Frontend** | Next.js (App Router) + React 18 + Tailwind. | File routing, RSC for the doc list, easy deploy. |
| **HTTP client (FE)** | **axios** instance + **TanStack Query** (v5) for server state. | Caching, retries, mutation invalidation; typed query keys. |
| **Rich-text editor** | Tiptap v2 (ProseMirror-based). | Headless; first-party B/I/U/heading/list extensions; JSON output. |
| **Backend framework** | **Hono** on Node runtime (or Fastify; see ADR-006 in HLD). | Tiny, fast, middleware-friendly; plays well with the DDD layering. |
| **HTTP client (BE)** | **axios** instance for any outbound HTTP (docx parsing service, future integrations, webhooks). | One consistent client lib across the codebase; interceptors for logging/retries. |
| **Database** | **PostgreSQL** via **Prisma** (local + prod). | Real DB; typed client; migrations. SQLite avoided so prod parity is exact. |
| **Cache / queue (optional)** | none in v1. | Keep moving parts low. |
| **Logger** | **pino** + **AsyncLocalStorage (ALS)** for request-scoped context. | High-throughput JSON logs; correlation id flows without explicit threading. |
| **File parsing** | `marked` (md→tokens→Tiptap JSON), custom `.txt` splitter, `mammoth` (`.docx`→HTML→Tiptap). | Mature, no native builds. |
| **Sanitization** | Allowlist of Tiptap node/mark types (pure function). | Defense-in-depth vs XSS. |
| **Styling** | Tailwind CSS. | Rapid, consistent. |
| **Testing** | **Vitest** (unit/integration, against testcontainers Postgres) + **Playwright** (1 e2e). | Vitest for pure core + repos; Playwright for the sharing happy-path. |
| **Validation** | **zod** for request/response DTOs. | Runtime + compile-time types from one source. |
| **Lint/format** | ESLint + Prettier. | Hygiene. |
| **Package manager** | **pnpm**. | Fast, disk-efficient workspaces. |
| **Local run** | **Docker Compose** (api + web + postgres). | One command, exact prod parity for the DB; no "works on my machine". |
| **Deployment** | **Render**: web service (Next) + web service (API) + managed Postgres. Or Railway. | Free/hobby tier; reviewers pay $0. |

> **Note on HTTP clients:** axios appears on **both** sides. On the FE, axios is the transport under TanStack Query. On the BE, axios is the outbound HTTP client used by any module that calls an external service (e.g., a future webhook, or a remote reference for docx conversion). In v1 there may be no external HTTP dependency; the axios instance + interceptors are still wired in §13 module `infra/http` so the pattern is established and the CLS `reqId` auto-propagates via an interceptor.

---

## 7. Data Model

Prisma schema (authoritative; ERD in `HLD.md` §5).

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  color     String
  createdAt DateTime @default(now())

  ownedDocs  Document[] @relation("OwnedDocs")
  sharedDocs Share[]    @relation("GrantedShares")
}

model Document {
  id        String   @id @default(cuid())
  title     String   @default("Untitled")
  content   Json     @default("{\"type\":\"doc\",\"content\":[]}") // Tiptap JSON
  ownerId   String
  owner     User     @relation("OwnedDocs", fields: [ownerId], references: [id], onDelete: Cascade)
  shares    Share[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  version   Int      @default(0) // optimistic-concurrency counter

  @@index([ownerId])
}

model Share {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  granteeId  String
  grantee    User     @relation("GrantedShares", fields: [granteeId], references: [id], onDelete: Cascade)
  role       Role     @default(EDITOR)
  createdAt  DateTime @default(now())

  @@unique([documentId, granteeId])
  @@index([granteeId])
}

enum Role {
  EDITOR
}
```

**Key additions vs v1 schema:**
- `Document.version` (Int) — optimistic-concurrency token for the pure merge core (NFR-11). Every successful update increments it; a stale `version` on PATCH returns `409`.
- Postgres (not SQLite) so prod parity is exact under Docker Compose.

---

## 8. API Contract (REST/JSON)

Base URL: `/api`. All doc-scoped reads + all mutations require `X-User-Id`. Authorization is enforced in the domain layer (`docs/authorization.ts` — a pure function), not just in routes (NFR-5).

| Method | Path | Purpose | Body / Query | Success | Errors |
|---|---|---|---|---|---|
| `GET` | `/api/health` | Liveness + seed status. | — | `200 { ok, db, seededUsers, version }` | — |
| `GET` | `/api/users` | List seeded users. | — | `200 [{id,name,email,color}]` | — |
| `GET` | `/api/users/me` | Current user. | — | `200 User` | `401` |
| `GET` | `/api/docs` | Docs visible to current user. | — | `200 { owned: [...], shared: [...] }` | `401` |
| `POST` | `/api/docs` | Create empty doc. | `{ title? }` | `201 Document` | `401, 422` |
| `GET` | `/api/docs/:id` | Get one doc (owner or grantee). | — | `200 Document` | `401, 403, 404` |
| `PATCH` | `/api/docs/:id` | Update title/content (uses optimistic concurrency). | `{ title?, content?, version }` | `200 Document` | `401, 403, 404, 409, 422` |
| `DELETE` | `/api/docs/:id` | Delete (owner only). | — | `204` | `401, 403, 404` |
| `POST` | `/api/docs/:id/shares` | Grant access (owner only). | `{ granteeId, role? }` | `201 Share` | `401, 403, 404, 409, 422` |
| `DELETE` | `/api/docs/:id/shares/:userId` | Revoke (owner only). | — | `204` | `401, 403, 404` |
| `POST` | `/api/import` | Upload → new doc. | `multipart/form-data` `file` | `201 Document` | `401, 413, 415, 422` |

**Concurrency note:** `PATCH /api/docs/:id` is the single most important correctness path. The client sends the `version` it last loaded. The domain layer's pure `applyUpdate` (§13 `docs` module) decides whether to accept, reject (stale → 409), or sanitize. See HLD §6 for the flow.

---

## 9. UI / UX Flows

### 9.1 Screens
1. **Document list** (`/`) — *My documents* and *Shared with me*. Top bar: current-user switcher, "New", "Import".
2. **Editor** (`/docs/[id]`) — title input + Tiptap toolbar + editor + Share button + autosave status.
3. **Share dialog** (modal) — search/select a seeded user, role (editor), Save/Remove.
4. **Access-denied** — clear message + "Back to my documents".

### 9.2 Happy paths
- **Create → Edit → Save → Reopen:** List → New → editor opens → type + format → autosave indicator `Saving…→Saved` → refresh → content intact.
- **Share:** Open a doc you own → Share → pick Bob → Save → switch to Bob → doc under *Shared with me* → open → edit → switch back to Alice → see Bob's edits (handled by TanStack Query cache invalidation + optimistic concurrency).
- **Import:** List → Import → choose `notes.md` → new doc opens with parsed rich-text content.
- **Deny:** As Carol, navigate to a doc only Alice owns → "Access denied".

### 9.3 UX details
- Autosave indicator: `Saved` / `Saving…` / `Save failed — retry`. Never silently lose content.
- Toolbar active-state reflects the format at the caret (Tiptap `isActive`).
- Keyboard shortcuts: `Ctrl/Cmd+S`, `B/I/U`, `Tab`/`Shift+Tab` (list indent).
- Empty states for both sections; non-blocking error toasts with a clear action.

---

## 10. Frontend Data Layer (axios + TanStack Query)

A single axios instance is the transport; TanStack Query owns caching, retries, and mutation invalidation.

- **`lib/axios.ts`** — axios instance, `baseURL = '/api'`, request interceptor injects `X-User-Id` from the `ajaia_user` cookie and propagates `X-Request-Id`; response interceptor maps HTTP errors to typed `ApiError`s.
- **`lib/query-client.ts`** — QueryClient with sensible defaults (`retry: 1`, `staleTime: 10s`, `refetchOnWindowFocus: false`).
- **`api/queries.ts`** — query keys (`['docs']`, `['doc', id]`) + `useDocs`, `useDoc`, `useUsers` hooks.
- **`api/mutations.ts`** — `useUpdateDoc` (mutation that on settle invalidates `['docs']` and `['doc', id]`), `useCreateDoc`, `useDeleteDoc`, `useGrantShare`, `useRevokeShare`, `useImportDoc`.
- **Optimistic updates** are used for title rename; content edits go through debounced autosave (no optimistic UI on the editor body itself — Tiptap owns that state).
- **`onUpdate` flow** sends the Tiptap JSON **plus** the `version` the client last saw; a `409` triggers a refetch + a "document was edited elsewhere" toast.

---

## 11. Prioritization & Scope Cuts

| Cut | Rationale |
|---|---|
| Simulated auth instead of real auth | Real auth burns 1–2h with low product signal. The *sharing logic* is what we test. |
| Owner vs editor only | One role demonstrates the access model end-to-end. |
| Postgres via Docker Compose locally + Render managed PG in prod | Exact prod parity; no SQLite-to-PG surprises. |
| Tiptap JSON source of truth | Cheap sanitize, lossless round-trips, future-proof for collab. |
| `.docx` import is *Should* | `.md`/`.txt` cover the import story; `.docx` adds dependency + edge cases. |
| No realtime cursors in v1 | Highest-effort, lowest-signal-per-hour. The pure merge core is shaped so it *could* be added. |
| One Playwright e2e + focused unit tests | A meaningful test of the riskiest logic satisfies NFR-7 without burning the timebox. |

---

## 12. Testing Strategy

| Layer | Tool | What's covered | Threshold |
|---|---|---|---|
| **Pure core (unit)** | Vitest | `docs/authorization`, `docs/merge`, `content/sanitize`, `parsers/*`. No DB, no I/O. | Must pass. |
| **Repository (integration)** | Vitest + testcontainers Postgres | `repos/*` against a real Postgres; authorization end-to-end at the repo boundary. | Must pass. |
| **API (integration)** | Vitest + in-memory Hono + testcontainers | Authorization (FR-4.4): owner OK, grantee OK, stranger 403; non-owner delete 403; concurrency 409; import 413/415. | Must pass — this is the "at least one meaningful test." |
| **E2E (smoke)** | Playwright (1 test) | Alice creates → shares → Bob sees & edits → Alice sees edit. | Must pass. |
| **Manual** | Walkthrough video | UX quality, formatting round-trip, import. | Recorded. |

---

## 13. Module-by-Module Breakdown (Backend — anemic tactical DDD)

The backend is organized into **bounded modules**. Each module follows an **anemic tactical DDD** style:

- **`domain/`** — anemic data structures (TS interfaces/types) + **pure functions** that encode business rules. No Prisma, no I/O, no framework imports. These are the most-tested units.
- **`infra/`** — repository implementations (Prisma), the axios HTTP client, logger plumbing.
- **`application/`** — thin orchestrators (use-cases) that load data via repos, call pure domain functions, and persist. The *only* place transactions live.
- **`presentation/`** — Hono route handlers; thin: parse → call application use-case → shape response.

> **Why "anemic":** the data structures (`Document`, `Share`, `User`) carry no behavior. All rules live in **pure functions** (`canRead(doc, userId, shares)`, `applyUpdate(doc, patch, expectedVersion)`, `sanitize(tiptapJson)`). This makes the core trivially testable (no DB, no mocks) and lets the concurrency logic be reasoned about formally — a hard requirement for future realtime editing.

### Module map

```
apps/api/src/
├── main.ts                      # boots Hono app, wires middleware, runs ensureSeed
├── server.ts                    # createServer(app) for Node adapter
├── config.ts                    # env config (zod-validated)
├── middleware/
│   ├── request-context.ts       # ALS: starts context, attaches reqId/userId
│   ├── error.ts                 # maps DomainError → HTTP status
│   ├── logger.ts                # pino http logger (uses ALS context)
│   └── current-user.ts          # reads X-User-Id → ctx.user (or 401)
├── modules/
│   ├── users/                   # seeded users + current-user lookup
│   ├── docs/                    # documents (CRUD + authorization + merge)
│   ├── shares/                  # share grants
│   └── import/                  # file upload → new doc
├── infra/
│   ├── db/prisma.ts             # PrismaClient singleton
│   ├── http/axios.ts            # axios instance + interceptors (reqId)
│   ├── logger/pino.ts           # pino instance bound to ALS context
│   └── storage/                 # (reserved) file storage adapter
├── shared/
│   ├── errors.ts                # DomainError hierarchy
│   ├── result.ts                # Result<T, E> (pure)
│   └── types.ts                 # cross-module DTOs
└── seed/ensureSeed.ts
```

### 13.1 `modules/users`

**Purpose:** resolve the current user from `X-User-Id`; list seeded users for the share dialog.

- `domain/`
  - `User.ts` — anemic type `{ id, name, email, color, createdAt }`.
  - pure fns: none beyond types.
- `infra/UserRepository.ts` — `findById(id)`, `findAll()`.
- `application/GetCurrentUser.ts`, `ListUsers.ts` — one-liner use-cases wrapping the repo.
- `presentation/users.routes.ts` — `GET /api/users`, `GET /api/users/me`.

### 13.2 `modules/docs`  ⭐ (the heart of the app)

**Purpose:** document lifecycle, authorization, and **concurrency-controlled update**.

- `domain/`
  - `Document.ts` — anemic type. Includes `version: number`.
  - `authorization.ts` ⭐ **pure**:
    - `canRead(doc, userId, shares): boolean`
    - `canWrite(doc, userId, shares): boolean`
    - `canManage(doc, userId): boolean` (owner-only: delete, share)
    - `assertCanRead/canWrite/canManage(...)` → throws `ForbiddenError` (still pure: throws, no I/O).
  - `merge.ts` ⭐ **pure** — the optimistic-concurrency core:
    - `applyUpdate(doc, patch: { title?, content? }, expectedVersion): Result<Document, ConflictError | ValidationError>`
      - if `expectedVersion !== doc.version` → `ConflictError` (409).
      - if `patch.title === ''` → coerce to `'Untitled'` (FR-1.7) → still valid.
      - returns a **new** `Document` object with `version: doc.version + 1`, merged fields. **No mutation.**
  - `content.ts` — type re-export of the Tiptap JSON shape.
- `infra/DocumentRepository.ts` — Prisma-backed: `findById`, `findOwnedBy`, `findSharedWith`, `insert`, `update` (checks `version` in the WHERE clause as a DB-level safety net), `delete`.
- `application/`
  - `CreateDoc.ts` — `{ ownerId, title? } → doc`.
  - `GetDoc.ts` — authorizes via `assertCanRead`.
  - `UpdateDoc.ts` — loads doc, calls pure `applyUpdate`, persists via repo `update` (which also checks version atomically). On DB-level version mismatch → map to `ConflictError`.
  - `DeleteDoc.ts` — `assertCanManage`.
  - `ListVisibleDocs.ts` — returns `{ owned, shared }`.
- `presentation/docs.routes.ts` — `GET/POST/PATCH/DELETE /api/docs[/:id]`.

> **Why the pure `merge.ts`:** concurrency is the part of the app where mistakes are subtle and expensive. Keeping `applyUpdate` pure (no DB, no logging, no side effects) means it can be exhaustively unit-tested with property-style cases and reused unchanged when realtime collaboration lands.

### 13.3 `modules/shares`

**Purpose:** grant/revoke editor access.

- `domain/`
  - `Share.ts` — anemic type `{ id, documentId, granteeId, role }`.
  - `Role.ts` — `EDITOR` only in v1.
  - pure fns: `canGrant(doc, userId) === doc.ownerId === userId`.
- `infra/ShareRepository.ts` — `findGrantedTo(userId)`, `findForDoc(docId)`, `upsert(share)`, `delete(docId, userId)`, `exists(docId, userId)`.
- `application/`
  - `GrantShare.ts` — `assertCanManage`; rejects self-share (`grant eeId === ownerId` → 422); `upsert` (409 if dup handled gracefully → idempotent).
  - `RevokeShare.ts` — `assertCanManage`.
  - `ListShares.ts` — owner-only listing of grantees.
- `presentation/shares.routes.ts` — `POST /api/docs/:id/shares`, `DELETE /api/docs/:id/shares/:userId`.

### 13.4 `modules/import`

**Purpose:** turn an uploaded file into a new document.

- `domain/`
  - `FileImport.ts` — anemic input/output types.
  - `rules.ts` ⭐ **pure**:
    - `maxUploadBytes = 2_000_000`.
    - `allowedExtensions = ['.md', '.txt', '.docx']`.
    - `validateUpload({ filename, size }): Result<Ext, Error>` (413 / 415 / 422).
    - `deriveTitle(filename): string` (strip extension).
- `infra/parsers/`
  - `parseMarkdown.ts` — `marked` tokens → Tiptap JSON (pure: string in, JSON out).
  - `parseText.ts` — blank-line split → paragraphs (pure).
  - `parseDocx.ts` — `mammoth` (async; the only I/O parser).
  - `parseByExtension.ts` — dispatcher (pure except docx).
- `application/ImportFile.ts` — orchestrates: `validateUpload` → pick parser → `sanitize` (from `content`) → `CreateDoc`.
- `presentation/import.routes.ts` — `POST /api/import` (multipart via Hono's body parser).

### 13.5 `modules/content` (shared pure core)

**Purpose:** the XSS-safe content boundary, used by both `docs` (on write) and `import`.

- `sanitize.ts` ⭐ **pure**: walks Tiptap JSON; keeps only allowed node types (`doc`, `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `text`) and marks (`bold`, `italic`, `underline`); drops everything else. Returns a **new** JSON object.
- `tiptap-types.ts` — TS types for the Tiptap doc shape (used across modules).
- This module has **zero** dependencies on Prisma/Hono/axios. It is the most heavily unit-tested code in the project.

### 13.6 `infra/logger` (pino + AsyncLocalStorage)

**Purpose:** correlated, structured logs without explicit context threading (NFR-12, FR-7).

- `pino.ts` — base pino instance (JSON to stdout, level from `config.logLevel`).
- `request-context.ts` (also referenced from `middleware/`) — creates an `AsyncLocalStorage<RequestContext>`; `RequestContext = { reqId, userId? }`.
- `logger.ts` — exports `logger` whose `info/warn/error` **automatically merge** the current ALS context (child logger pattern). So any module calls `logger.info({ docId }, 'doc updated')` and the line automatically includes `reqId` + `userId` from the surrounding request.
- The axios **request interceptor** (in `infra/http/axios.ts`) reads the current `reqId` from ALS and sets it as `X-Request-Id` on outbound calls — so the correlation id propagates to any downstream service.

### 13.7 `infra/http` (axios)

- `axios.ts` — axios instance with:
  - request interceptor: inject `X-Request-Id` from ALS (or generate one).
  - response interceptor: log `outbound` calls at `debug`; on error, log + rethrow a typed `HttpOutboundError`.
  - timeout default 10s.
- Even though v1 has no required outbound HTTP, this is wired so the pattern is established and the CLS `reqId` propagates automatically.

### 13.8 `presentation` (Hono routes)

Each route file is deliberately thin:
1. `ctx.var.parse(body)` via zod.
2. Call an application use-case (passing `ctx.user` from the current-user middleware).
3. Return JSON with the correct status.
4. Errors bubble to the centralized `error.ts` middleware, which maps `DomainError` subclasses to HTTP statuses (401/403/404/409/413/415/422/500).

---

## 14. Deployment & Local Run

### 14.1 Local — Docker Compose (primary path)

`docker compose up` brings up: `postgres`, `api` (Hono), `web` (Next). The API runs Prisma migrations on boot. The web app proxies `/api/*` to the API service.

```yaml
# docker-compose.yml (excerpt — full file below in §16)
services:
  postgres:
    image: postgres:16-alpine
    environment: [POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck: ...
  api:
    build: ./apps/api
    depends_on: [postgres]
    environment: [DATABASE_URL, LOG_LEVEL]
    ports: ["3001:3001"]
  web:
    build: ./apps/web
    depends_on: [api]
    environment: [API_BASE_URL]
    ports: ["3000:3000"]
volumes: { pgdata: {} }
```

### 14.2 Local — without Docker (fallback)

`pnpm install && pnpm -r dev` runs both apps against a local Postgres (or dockerized DB only). Documented in README.

### 14.3 Production

- **Render:** web service (Next) + web service (API) + managed Postgres. Web service env `API_BASE_URL` → API service URL.
- **Build:** `pnpm -r build`. **Start:** API `node dist/main.js`; web `next start`.
- **Seed:** idempotent on boot.
- **CI checks:** `pnpm lint && pnpm typecheck && pnpm test && pnpm -r build`.

### 14.4 Submission

Folder contains: source, `README.md`, `ARCHITECTURE.md`, `AI_WORKFLOW.md`, `SUBMISSION.md`, `WALKTHROUGH_URL.txt`, screenshots/GIF, live URL, credentials for seeded users.

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `.docx` import (mammoth) eats time. | Med | Med | Timebox; ship `.md`/`.txt` only if it slips. |
| Tiptap JSON sanitizer has gaps → XSS. | Low | High | Allowlist approach; unit test with XSS payloads; never render raw client HTML. |
| Optimistic-concurrency bug → lost updates. | Med | High | Pure `applyUpdate` exhaustively unit-tested; DB-level version check as backstop. |
| Docker Compose friction on reviewer machines. | Low | Med | Provide non-Docker fallback; test on clean machines. |
| Timebox overrun. | Med | Med | Strict build order; cut `.docx` and Playwright before cutting core editing/sharing. |
| Reviewers can't reach live URL. | Low | High | Deploy early, right after CRUD works. |

---

## 16. File Structure (full tree)

```
ajaia-docs/
├── apps/
│   ├── api/                                   # Hono + Prisma backend (anemic tactical DDD)
│   │   ├── prisma/
│   │   │   ├── schema.prisma                  # User, Document (w/ version), Share
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── main.ts                        # boot Hono, wire middleware, ensureSeed
│   │   │   ├── server.ts                      # Node adapter
│   │   │   ├── config.ts                      # zod-validated env
│   │   │   ├── middleware/
│   │   │   │   ├── request-context.ts         # AsyncLocalStorage<RequestContext>
│   │   │   │   ├── error.ts                   # DomainError → HTTP status
│   │   │   │   ├── logger.ts                  # pino http logger (ALS-aware)
│   │   │   │   └── current-user.ts            # X-User-Id → ctx.user (or 401)
│   │   │   ├── modules/
│   │   │   │   ├── users/
│   │   │   │   │   ├── domain/User.ts
│   │   │   │   │   ├── infra/UserRepository.ts
│   │   │   │   │   ├── application/{GetCurrentUser,ListUsers}.ts
│   │   │   │   │   └── presentation/users.routes.ts
│   │   │   │   ├── docs/
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── Document.ts
│   │   │   │   │   │   ├── authorization.ts             # ⭐ pure authz
│   │   │   │   │   │   ├── merge.ts                  # ⭐ pure concurrency core
│   │   │   │   │   │   └── content.ts
│   │   │   │   │   ├── infra/DocumentRepository.ts
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── CreateDoc.ts
│   │   │   │   │   │   ├── GetDoc.ts
│   │   │   │   │   │   ├── UpdateDoc.ts              # calls pure applyUpdate
│   │   │   │   │   │   ├── DeleteDoc.ts
│   │   │   │   │   │   └── ListVisibleDocs.ts
│   │   │   │   │   └── presentation/docs.routes.ts
│   │   │   │   ├── shares/
│   │   │   │   │   ├── domain/{Share,Role}.ts
│   │   │   │   │   ├── infra/ShareRepository.ts
│   │   │   │   │   ├── application/{GrantShare,RevokeShare,ListShares}.ts
│   │   │   │   │   └── presentation/shares.routes.ts
│   │   │   │   ├── import/
│   │   │   │   │   ├── domain/rules.ts               # ⭐ pure validation
│   │   │   │   │   ├── infra/parsers/{parseMarkdown,parseText,parseDocx,parseByExtension}.ts
│   │   │   │   │   ├── application/ImportFile.ts
│   │   │   │   │   └── presentation/import.routes.ts
│   │   │   │   └── content/                          # shared pure core
│   │   │   │       ├── sanitize.ts                   # ⭐ pure XSS guard
│   │   │   │       └── tiptap-types.ts
│   │   │   ├── infra/
│   │   │   │   ├── db/prisma.ts
│   │   │   │   ├── http/axios.ts                     # axios + ALS reqId
│   │   │   │   └── logger/{pino,logger}.ts           # pino + ALS
│   │   │   ├── shared/{errors,result,types}.ts
│   │   │   └── seed/ensureSeed.ts
│   │   ├── tests/
│   │   │   ├── unit/                                  # pure core (no DB)
│   │   │   │   ├── authorization.spec.ts
│   │   │   │   ├── merge.spec.ts
│   │   │   │   ├── sanitize.spec.ts
│   │   │   │   ├── parsers.spec.ts
│   │   │   │   └── import-rules.spec.ts
│   │   │   ├── integration/                           # repos + routes vs testcontainers PG
│   │   │   │   ├── docs-api.spec.ts
│   │   │   │   ├── shares-api.spec.ts
│   │   │   │   └── import-api.spec.ts
│   │   │   └── helpers/{db,http}.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── web/                                  # Next.js frontend
│       ├── src/
│       │   ├── app/                          # App Router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                  # / → <DocumentList/>
│       │   │   ├── docs/[id]/page.tsx        # editor
│       │   │   └── providers.tsx             # QueryClientProvider
│       │   ├── components/
│       │   │   ├── DocumentList.tsx
│       │   │   ├── UserSwitcher.tsx
│       │   │   ├── Editor.tsx                # Tiptap host
│       │   │   ├── Toolbar.tsx
│       │   │   ├── ShareDialog.tsx
│       │   │   ├── ImportButton.tsx
│       │   │   ├── AccessDenied.tsx
│       │   └── ui/{button,dialog,toast}.tsx
│       │   ├── lib/
│       │   │   ├── axios.ts                  # axios instance + X-User-Id + X-Request-Id
│       │   │   ├── query-client.ts
│       │   │   └── api-types.ts              # mirrors packages/shared
│       │   └── api/
│       │       ├── queries.ts                # useDocs, useDoc, useUsers
│       │       └── mutations.ts              # useUpdateDoc, useCreateDoc, ...
│       ├── tests/e2e/sharing.spec.ts         # Playwright
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── next.config.js
├── packages/
│   └── shared/                               # shared TS types + zod schemas (FE + BE)
│       ├── src/
│       │   ├── contracts.ts                  # Document, Share, User DTOs + zod
│       │   └── api-paths.ts
│       └── package.json
├── docker-compose.yml                        # postgres + api + web
├── docker-compose.override.yml               # dev niceties (hot reload, etc.)
├── .env.example
├── pnpm-workspace.yaml
├── package.json                              # root scripts: dev, build, test, lint
├── turbo.json                                # (optional) task orchestration
├── tsconfig.base.json
├── .github/workflows/ci.yml
├── README.md
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
├── SUBMISSION.md
├── WALKTHROUGH_URL.txt
└── TECH_SPEC.md / HLD.md                     # (these docs)
```

---

## 17. Glossary

- **Anemic tactical DDD** — a flavor of tactical DDD where entities/value objects are data-only ("anemic") and business rules live in **pure functions** in the domain layer, organized within bounded modules.
- **Pure function** — output depends only on inputs; no side effects; no mutation of arguments. The core authz, merge, and sanitize logic is pure.
- **ALS (AsyncLocalStorage)** — Node's API for propagating request-scoped context across async boundaries without explicit threading; used for the correlation id and current user.
- **Optimistic concurrency** — each document carries a `version`; a client must send the version it last saw; a mismatch yields `409`.
- **Tiptap JSON** — ProseMirror document as JSON; the authoritative content format.
- **ReqId / correlation id** — per-request UUID; in every log line and every outbound HTTP `X-Request-Id`.

---

## 18. Traceability

| Assignment requirement | Where satisfied |
|---|---|
| Create / rename / edit / save / reopen | FR-1.1–1.5, §9, `modules/docs` |
| Rich-text: bold/italic/underline/headings/lists | FR-2.1–2.3, `Editor.tsx` |
| File upload → editable doc | FR-3.1–3.5, `modules/import` |
| Sharing: owner + grant access + visual distinction | FR-4.1–4.4, `modules/shares` |
| Persistence across refresh/restart | FR-6.1–6.3, Postgres + Docker Compose |
| Setup/run instructions | §14, README, `docker-compose.yml` |
| Live deployment | §14.3 |
| Validation + error handling | NFR-3/4/5, FR-3.5, §8 errors, `shared/errors.ts` |
| At least one meaningful test | §12, NFR-7 |
| Architecture note | `ARCHITECTURE.md` |
| AI-workflow note | `AI_WORKFLOW.md` |
| Walkthrough video | submission |
| Stretch (realtime/comments/history/export/RBAC) | §2.2 Non-Goals; pure core designed for future realtime |
