# Ajaia Docs — High-Level Design (HLD)

> **Status:** Draft v2.0 (planning phase — no code yet)
> **Author:** Candidate
> **Companion:** [`TECH_SPEC.md`](./TECH_SPEC.md) defines requirements, data model, API contract, and the module-by-module breakdown. This HLD describes **how** the system is structured to deliver them — the layered, **anemic tactical DDD** backend, the axios + TanStack Query frontend, the **pino + AsyncLocalStorage** logger, and the **pure-function core** that owns concurrency and authorization.

---

## 1. Overview

Ajaia Docs is a two-service web application: a rich-text editor frontend and a layered backend. The design optimizes for:

- **Correctness where it matters** — authorization and concurrent updates are pure functions, exhaustively unit-tested, with the database as a backstop.
- **Operability** — every request carries a correlation id that flows through logs *and* outbound HTTP automatically (AsyncLocalStorage).
- **Fast delivery in a 4–6 hour timebox** — mature libraries, one runtime, one database, one command to run it all (`docker compose up`).
- **Production parity** — the same Postgres image runs locally and in prod; no SQLite-to-Postgres surprises.

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Browser (Client)                          │
│   Next.js (App Router) + React 18 + Tailwind + Tiptap editor         │
│                                                                      │
│   UI components ──► TanStack Query ──► axios instance ──► /api        │
│       (X-User-Id cookie → header; X-Request-Id generated client-side) │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS (JSON / multipart)
┌──────────────────────────────────▼───────────────────────────────────┐
│                      apps/api  (Hono on Node)                        │
│                                                                      │
│   ┌────────────────────────── Presentation ──────────────────────┐   │
│   │ Hono routes: /api/{docs, users, shares, import}              │   │
│   │ (thin: zod parse → use-case → shape response)                │   │
│   └────────────────────────────┬─────────────────────────────────┘   │
│   ┌────────────────────────────▼─────────────────────────────────┐   │
│   │ Application layer  (use-cases / orchestrators)               │   │
│   │ CreateDoc, GetDoc, UpdateDoc, DeleteDoc, ListVisibleDocs,    │   │
│   │ GrantShare, RevokeShare, ImportFile, GetCurrentUser, ...     │   │
│   │  ↳ transactions live here, and only here                     │   │
│   └────────────────────────────┬─────────────────────────────────┘   │
│   ┌────────────────────────────▼─────────────────────────────────┐   │
│   │ Domain layer  (PURE FUNCTIONS — no I/O, no framework)        │   │
│   │ docs/authorization · docs/merge · content/sanitize ·         │   │
│   │ import/rules                                                 │   │
│   │  ↳ the most-tested code in the project                       │   │
│   └────────────────────────────▲─────────────────────────────────┘   │
│   ┌────────────────────────────┴─────────────────────────────────┐   │
│   │ Infra layer                                                  │   │
│   │ • Repositories (Prisma)  • http/axios  • logger/pino+ALS     │   │
│   └────────────────────────────┬─────────────────────────────────┘   │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │ TCP
                          ┌──────▼──────┐
                          │ PostgreSQL  │  (managed in prod; container locally)
                          └─────────────┘
```

**Key shape:** a strictly layered backend where dependencies point *downward* (presentation → application → domain ← infra). The **domain layer depends on nothing** — it is pure TypeScript with no imports from Prisma, Hono, axios, or pino. This is the load-bearing architectural constraint (see ADR-004).

---

## 2. Architectural Style — Anemic Tactical DDD

The backend applies **tactical DDD** building blocks but keeps entities and value objects **anemic** (data-only). Behavior is expressed as **pure functions** grouped inside **bounded modules**.

| DDD building block | How it's realized in this codebase |
|---|---|
| **Bounded context / module** | A folder under `modules/`: `users`, `docs`, `shares`, `import`, plus the shared `content` core. |
| **Entity** | An anemic TS interface (`Document`, `User`, `Share`) — fields only, no methods. |
| **Value object** | Anemic branded types: `DocumentId`, `UserId`, `Role`, `Version`. |
| **Domain service** | A **pure function** operating on entities: `canRead`, `applyUpdate`, `sanitize`. No singletons, no state. |
| **Repository (interface)** | A TS interface in the domain/application layer (`DocumentRepository`) — what the use-case depends on. |
| **Repository (implementation)** | A Prisma-backed class in `infra/` — what gets wired at boot. |
| **Use case (application)** | A function that orchestrates: load via repo → call pure domain fn → persist. The only place a DB transaction is opened. |
| **Aggregate root** | `Document` is the aggregate root of the `docs` module; `Share` rows are part of the aggregate for authorization decisions. |

**Why anemic?** Three reasons that matter for this assignment:

1. **Testability.** Pure functions are tested with a single `import` — no test DB, no mocks, no harness. The riskiest logic (authz, merge, sanitize) gets the most tests at the lowest cost.
2. **Concurrency reasoning.** Optimistic concurrency is subtle. A pure `applyUpdate(doc, patch, expectedVersion)` is a total function whose behavior can be specified exhaustively and checked with property tests — impossible to do confidently if the function reaches into a DB or a logger.
3. **Future realtime.** When realtime collaboration lands, the *same* pure merge function becomes the server-side transform/merge authority. Investing in it now is not gold-plating; it is the load-bearing seam for the most likely stretch goal.

---

## 3. Quality Attributes / Architectural Drivers

Derived from `TECH_SPEC.md` §5 (NFRs). Ranked by influence on this design:

| Driver | How it shapes the architecture |
|---|---|
| **Authorization correctness** (NFR-5) | Authz lives in one pure module (`docs/authorization.ts`) called from every doc/share use-case; tested in isolation and again through the API. |
| **Concurrency correctness** | `docs/merge.ts` is pure; the DB row carries a `version` and the repo's update checks it in the WHERE clause as a backstop. |
| **XSS safety** (NFR-4) | Tiptap JSON is the source of truth; `content/sanitize.ts` is a pure allowlist walk; called on every write path (edit *and* import). |
| **Observability** (NFR-12, FR-7) | pino + ALS gives correlated JSON logs with zero explicit context threading; axios interceptor propagates `reqId` to outbound calls. |
| **Time-to-ship** | One runtime (Node), one DB (Postgres), one command (`docker compose up`); mature libs (Tiptap, Prisma, Hono, axios, TanStack Query). |
| **Production parity** | Same Postgres image locally and in prod; migrations run on boot; env-driven config. |
| **Editor responsiveness** (NFR-1) | Tiptap owns local state; saves are debounced + async; TanStack Query cache invalidation keeps lists fresh without refetch storms. |

---

## 4. Architecture Decision Records (ADRs)

### ADR-001 — Two-service split (web + api), not a single Next app
- **Context:** v1 considered a single Next.js app doing UI + API + DB in one process (as in the earlier draft).
- **Decision:** Split into `apps/web` (Next.js, UI only) and `apps/api` (Hono, pure API). They talk over HTTP via axios.
- **Consequences:** Cleaner layering; the backend's DDD structure isn't entangled with React/Next; the FE can use TanStack Query against a real HTTP boundary; deployable independently. *Tradeoff:* two deployables and a network hop. Acceptable because the timebox still allows it (Hono + Next are both fast to scaffold) and the separation pays off in testability and in the AI-workflow narrative.
- **Revisit if:** the network hop or double-deploy materially slows the build — collapse to a single Next app with the same layering.

### ADR-002 — Hono for the API (not Express/Fastify/Next routes)
- **Context:** Need a small, typed, middleware-friendly Node web framework.
- **Decision:** **Hono**. Tiny, first-class TypeScript, clean middleware pipeline, works on Node via `@hono/node-server`.
- **Consequences:** Middleware order is explicit (request-context → logger → current-user → routes → error). zod validation via `@hono/zod-openapi` is optional. *Tradeoff:* less ecosystem than Express; fine for this scope.

### ADR-003 — Postgres + Prisma (not SQLite)
- **Context:** Earlier draft used SQLite for zero-ops convenience.
- **Decision:** **PostgreSQL** via Prisma everywhere; local via Docker Compose, prod via Render managed Postgres.
- **Consequences:** Exact prod parity (same engine, same SQL semantics, same row-level behaviors including the `version` optimistic-lock WHERE clause). Migrations are versioned. *Tradeoff:* one more container locally — solved by Docker Compose.

### ADR-004 — Anemic domain layer of pure functions (the load-bearing decision)
- **Context:** Where should business rules live?
- **Decision:** The **domain layer is pure TypeScript functions on anemic data**. No class methods on entities, no framework imports, no I/O. Use-cases in the application layer orchestrate repos + pure functions.
- **Consequences:** The riskiest logic (authz, merge, sanitize) is trivially unit-testable. The same merge function is reusable for a future realtime layer. *Tradeoff:* less "OO-pretty" than rich entities; intentional, documented, and the right call for a pure-TS codebase under time pressure.

### ADR-005 — Optimistic concurrency via `version` column (pure decide, DB backstop)
- **Context:** Two surfaces (owner + editor) can edit the same doc; autosave means concurrent writes are likely.
- **Decision:** Each `Document` has `version: Int`. The client sends the version it last loaded on PATCH. The pure `applyUpdate(doc, patch, expectedVersion)` returns a `ConflictError` if stale; the repo's `update` *also* checks `version` in its WHERE clause so a race that slips past the in-memory check is still rejected at the DB.
- **Consequences:** No lost updates; clients get a 409 and can refetch + merge. *Tradeoff:* clients must handle 409 (TanStack Query makes this a mutation-error path with a refetch).

### ADR-006 — pino + AsyncLocalStorage for correlated logs
- **Context:** Passing a `reqId`/`userId` through every function signature is noisy and easy to forget.
- **Decision:** A single `AsyncLocalStorage<RequestContext>` is entered per request by middleware. A custom `logger` reads from ALS so every `logger.info(...)` automatically includes `reqId` and `userId`.
- **Consequences:** Zero-context-threading logs; the axios outbound interceptor reads the same ALS store to set `X-Request-Id` on downstream calls. *Tradeoff:* ALS has subtle interaction with some callback patterns — mitigated by staying in `async/await` everywhere.

### ADR-007 — axios on both sides + TanStack Query on the FE
- **Context:** Need HTTP clients; consistency matters.
- **Decision:**
  - **FE:** one axios instance (intercepts: inject `X-User-Id` from cookie, generate/forward `X-Request-Id`, normalize errors) as the transport beneath **TanStack Query** (caching, retries, mutation invalidation).
  - **BE:** one axios instance for outbound HTTP (intercepts: pull `reqId` from ALS → `X-Request-Id`; log at `debug`; rethrow as `HttpOutboundError`). In v1 there may be zero required outbound calls; the client is wired anyway so the pattern is established and the `reqId` propagation is exercised.
- **Consequences:** One mental model for HTTP across the repo; FE gets a battle-tested server-cache; BE's outbound calls are automatically correlated with the inbound request.

### ADR-008 — Tiptap JSON as the source of truth (not HTML)
- **Context:** Rich text can be stored as HTML or as Tiptap/ProseMirror JSON.
- **Decision:** Store and transport Tiptap JSON. Render to HTML only inside the editor.
- **Consequences:** Sanitization is a schema allowlist, not an HTML allowlist (fewer XSS gaps). Round-trips are lossless (FR-6.2). Importers must produce Tiptap JSON.

---

## 5. Data Model (ERD)

(Prisma schema in `TECH_SPEC.md` §7.)

```
┌──────────────┐         owns          ┌──────────────────────┐
│     User     │1─────────────────────*│      Document        │
│──────────────│                        │──────────────────────│
│ id (PK)      │                        │ id (PK)              │
│ name         │                        │ title                │
│ email (uniq) │                        │ content (JSON)       │
│ color        │                        │ ownerId (FK)         │
│ createdAt    │                        │ version (Int)  ◄── optimistic-lock token
└──────┬───────┘                        │ createdAt / updatedAt│
       │                                └──────────┬───────────┘
       │ granted                                   │1
       │ shares                                    │
       │ *                                         │
┌──────▼───────┐1───── granted on ───────*┌──────▼─────────┐
│    Share      │                          │   (Document)   │
│──────────────│                          │   (see above)  │
│ id (PK)      │                          └────────────────┘
│ documentId FK│
│ granteeId FK │   unique(documentId, granteeId)  → 409 on duplicate grant
│ role (enum)  │
│ createdAt    │
└──────────────┘
```

**Relationships**
- `User 1—* Document` (owner); `onDelete: Cascade`.
- `User 1—* Share` (grantee); `onDelete: Cascade`.
- `Document 1—* Share`; `onDelete: Cascade`.
- `Share` unique on `(documentId, granteeId)`.

**Invariants enforced in the DB**
- `Document.ownerId` non-null.
- `Document.version ≥ 0`, incremented atomically by the repo's update.
- `Share.role ∈ {EDITOR}`.
- Cascade deletes keep the graph consistent.

---

## 6. Key Data Flows

### 6.1 Request lifecycle (middleware order matters)
```
inbound HTTP
  → request-context middleware   (ALS.enter(); ctx = { reqId, userId? })
  → logger middleware            (logs req start; uses ALS child logger)
  → current-user middleware      (X-User-Id → ctx.user, else 401 on protected routes)
  → route handler                (zod parse → use-case → JSON)
  → error middleware             (DomainError → HTTP status; logs at error)
  → ALS context automatically unwinds
```

### 6.2 Load document list
```
Browser: useDocs() → TanStack Query → axios GET /api/docs (X-User-Id)
  → route → ListVisibleDocs(userId)
       DocumentRepository.findOwnedBy(uid)   → owned[]
       ShareRepository.findGrantedTo(uid)    → shared[] (+ join doc)
  → 200 { owned, shared }
  → TanStack Query caches under ['docs']; list renders in two sections.
```

### 6.3 Edit + autosave (with optimistic concurrency)
```
User types → Tiptap updates local doc (sync, <16ms paint)
           → debounced 1500ms → PATCH /api/docs/:id { content, version }
  → route → UpdateDoc(id, userId, { content, version })
       1. doc = DocumentRepository.findById(id)         // load
       2. authorization.assertCanWrite(doc, userId, shares)   // PURE
          └── if fail → ForbiddenError → 403
       3. result = merge.applyUpdate(doc, { content }, version)   // PURE
          └── if version mismatch → ConflictError → 409
          └── if content invalid  → ValidationError → 422
       4. sanitized = content.sanitize(result.content)   // PURE
       5. DocumentRepository.update(id, sanitized, expectedVersion=version)
            WHERE id = ? AND version = ?   // DB backstop; 0 rows → 409
       6. return updated doc
  → 200 → TanStack Query invalidates ['doc', id] + ['docs'] → UI: "Saved"
  → 409 → TanStack Query refetch + toast "Edited elsewhere; refetched"
  → 5xx → toast "Save failed — retry"; editor retains last-known-good content
```

### 6.4 Share a document
```
Owner opens ShareDialog → useShares(docId) → GET /api/docs/:id/shares
  → ListShares(docId, ownerId) → assertCanManage → ShareRepository.findForDoc
Owner picks Bob (editor) → useGrantShare().mutate({ granteeId: bob })
  → POST /api/docs/:id/shares { granteeId, role }
  → route → GrantShare(docId, ownerId, granteeId, role)
       1. assertCanManage(doc, ownerId)        // PURE: owner-only
       2. if granteeId === ownerId → ValidationError (422)
       3. ShareRepository.upsert(docId, granteeId, role)  // unique → idempotent
  → 201 → invalidate ['doc', id] + ['docs']
Owner switches to Bob (UserSwitcher sets cookie) → ['docs'] refetch
  → doc now under "Shared with me"
Bob opens it → GetDoc authorizes via Share row (assertCanRead) → editor loads
Bob edits → UpdateDoc: assertCanWrite passes because a Share exists → 200
Alice switches back → sees Bob's edit (cache invalidated by Bob's mutation
                     invalidated by Bob's PATCH would have hit the same doc id,
                     but Alice's browser is a different client; she sees it on
                     her next refetch / window focus).
```

### 6.5 Import a file
```
User picks notes.md → useImportDoc().mutate(file)
  → axios POST /api/import (multipart; X-User-Id)
  → route → ImportFile(file, userId)
       1. ext = import.rules.validateUpload({ filename, size })   // PURE
          └── >2MB → PayloadTooLargeError → 413
          └── ext ∉ {md, txt, docx} → UnsupportedMediaError → 415
       2. title = import.rules.deriveTitle(filename)              // PURE
       3. rawTiptap = parsers.parseByExtension(ext, file)         // docx is async
       4. tiptap = content.sanitize(rawTiptap)                    // PURE
       5. doc = CreateDoc({ ownerId: userId, title, content: tiptap })
  → 201 → router.push(`/docs/${doc.id}`)
```

### 6.6 Access denial
```
Carol navigates to /docs/<alice's-private-doc>
  → useDoc(id) → GET /api/docs/:id
  → route → GetDoc(id, carolId)
       doc = DocumentRepository.findById(id)
       if !doc → NotFoundError → 404
       shares = ShareRepository.findForDoc(id)
       authorization.assertCanRead(doc, carolId, shares)   // PURE
         └── doc.ownerId !== carolId && no Share → ForbiddenError → 403
  → FE shows <AccessDenied/> + "Back to my documents".
```

### 6.7 Outbound HTTP (the BE axios instance)
```
Some use-case calls an external service (e.g., a future docx-conversion API):
  httpClient.get(url)
    → request interceptor reads ALS ctx.reqId, sets header X-Request-Id
    → response interceptor logs { outbound: url, status, durationMs }
    → on error → throw HttpOutboundError (mapped to 502 by error middleware)
The reqId on the outbound call matches the inbound request's log lines.
```

---

## 7. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| **Logging** | pino (JSON to stdout). A per-request child logger is built from ALS context; every log line carries `reqId`, `userId`, and call-site fields. Outbound axios calls log at `debug`. (FR-7.2, NFR-12) |
| **Correlation id** | Generated in `request-context` middleware if `X-Request-Id` is absent; echoed on the response; auto-propagated to outbound HTTP via the axios interceptor. (FR-7.1) |
| **Error model** | `DomainError` hierarchy in `shared/errors.ts`: `UnauthorizedError(401)`, `ForbiddenError(403)`, `NotFoundError(404)`, `ConflictError(409)`, `PayloadTooLargeError(413)`, `UnsupportedMediaError(415)`, `ValidationError(422)`, `HttpOutboundError(502)`. The `error.ts` middleware maps them to HTTP and logs at the right level. Unexpected errors → 500 + stack server-side, generic message client-side. |
| **Validation** | zod schemas for every request DTO, shared via `packages/shared` so FE and BE agree. |
| **Configuration** | `config.ts` zod-validates env (`DATABASE_URL`, `PORT`, `LOG_LEVEL`, `MAX_UPLOAD_BYTES`, `CORS_ORIGIN`, `SEED_ON_BOOT`). Sane defaults; no secret needed for the demo. |
| **Security** | (1) Tiptap JSON allowlist sanitization on every write. (2) Server-enforced authz on every doc/share route. (3) Upload size + extension gating. (4) Filenames sanitized for display only (never used as paths). (5) CORS locked to the web origin. (6) Same-site cookie for the user selector. *Not in scope:* real auth, rate limiting, TLS (handled by host). |
| **Transactions** | Opened only inside application use-cases (e.g., `DeleteDoc` deletes the doc; cascade removes shares — no explicit tx needed; `GrantShare` is a single upsert). The rule: **infra never decides business atomicity**. |
| **CORS** | API allows only the configured web origin; preflight for `PATCH`/`DELETE`/multipart. |
| **Health** | `GET /api/health` runs a `SELECT 1` and reports seed count + build version. |

---

## 8. Per-Module Domain Design

This section is the architectural companion to `TECH_SPEC.md` §13. It focuses on the *shape* of each module's domain logic and why it's pure.

### 8.1 `modules/content` — the shared pure core
The foundation other modules depend on. **Zero dependencies** on Prisma/Hono/axios/pino.

- `sanitize(tiptap: TiptapDoc): TiptapDoc` — recursive allowlist walk. Allowed nodes: `doc`, `paragraph`, `heading` (attrs: `{ level: 1|2|3 }`), `bulletList`, `orderedList`, `listItem`, `text`. Allowed marks: `bold`, `italic`, `underline`. Unknown anything → dropped. **Returns a new object; never mutates input.**
- `isSafe(tiptap): boolean` — predicate used in tests/property checks.
- Why pure: it is the XSS boundary and is called on every write path (edit + import). Purity → trivially fuzz-tested.

### 8.2 `modules/docs/domain` — authorization + merge
- `authorization.ts`:
  - `canRead(doc, userId, shares): boolean` — owner **or** grantee.
  - `canWrite(doc, userId, shares): boolean` — owner **or** editor-grantee.
  - `canManage(doc, userId): boolean` — owner only (delete, share, revoke).
  - `assertCanRead/Write/Manage` — throw `ForbiddenError`. Still pure (throwing ≠ side effect).
- `merge.ts`:
  - `applyUpdate(doc, patch, expectedVersion): Result<Document, ConflictError | ValidationError>`
    - if `expectedVersion !== doc.version` → `ConflictError`.
    - if `patch.title === ''` → coerce to `'Untitled'`.
    - return **new** `Document` with `{ ...doc, ...patch, version: doc.version + 1 }`.
  - Why pure: this is the concurrency authority. Its behavior is fully specified by its signature; no DB, no logging, no ALS. Property-tested.

> **Key invariant:** the pure domain layer never touches the repository or the logger. If a function seems to need them, it's an application-layer use-case, not a domain function.

### 8.3 `modules/shares/domain`
- `canGrant(doc, userId): boolean` — `doc.ownerId === userId`.
- `assertNotSelfShare(doc, granteeId)` — throws `ValidationError` if `granteeId === doc.ownerId`.
- Small surface; the interesting rules (can the grantee *read*?) live in `docs/authorization`, which composes with `shares`.

### 8.4 `modules/import/domain`
- `rules.ts`:
  - constants: `MAX_UPLOAD_BYTES = 2_000_000`, `ALLOWED_EXT = ['.md', '.txt', '.docx']`.
  - `validateUpload({ filename, size }): Result<Ext, Error>` — 413 / 415 / 422.
  - `deriveTitle(filename): string`.
- Parsers live in `infra/parsers/` (they do I/O for docx); `parseByExtension` dispatches; output flows through `content.sanitize` before persistence.

### 8.5 `modules/users/domain`
- Just the anemic `User` type; no non-trivial rules in v1. Kept as a module for symmetry and future growth (roles, preferences).

---

## 9. Frontend Architecture

### 9.1 Layering
```
app/ (routes)  →  components/ (UI)  →  api/ (TanStack Query hooks)  →  lib/axios.ts
```
UI components are presentational; they receive data via hooks and fire mutations via hooks. No `fetch` outside `lib/axios.ts`.

### 9.2 State ownership
| State | Owner |
|---|---|
| Tiptap editor content (the doc body) | Tiptap (local, uncontrolled by React) |
| Document title | React state, synced on save |
| Server state (lists, the saved doc, shares, users) | TanStack Query cache |
| Current user | `ajaia_user` cookie (read via a tiny helper) |
| Save status indicator | local React state, derived from the mutation's status |

### 9.3 Query/mutation design
- **Keys:** `['users']`, `['docs']`, `['doc', id]`, `['doc', id, 'shares']`.
- **Invalidation rules:**
  - `useUpdateDoc` success → invalidate `['doc', id]`, `['docs']`.
  - `useGrantShare` / `useRevokeShare` → invalidate `['doc', id, 'shares']`, `['docs']` (the doc may move between sections for the grantee).
  - `useDeleteDoc` → invalidate `['docs']`, remove `['doc', id]`.
  - `useImportDoc` success → invalidate `['docs']` + navigate to the new doc.
- **Optimistic UI:** title rename is optimistic (revert on error). Body content is *not* optimistic — Tiptap owns it; the save is fire-and-observe-status.
- **Error UX:** axios interceptor normalizes to `ApiError`; mutations surface a toast via the `onError` callback; 409 on update triggers a refetch + a "document was edited elsewhere" toast.

### 9.4 Routing
- `/` → `<DocumentList/>` (server-rendered shell, clienthydrated for mutations).
- `/docs/[id]` → `<Editor/>`. On 403, render `<AccessDenied/>` instead.

---

## 10. Observability Design

The pino + ALS design is worth calling out because it's a cross-cutting capability the rest of the system leans on.

```
                    ┌─────────────────────────────────────────┐
   inbound HTTP ──► │ request-context middleware              │
                    │  const store = new AsyncLocalStorage()  │
                    │  store.run({ reqId, userId? }, next)    │
                    └────────────────┬────────────────────────┘
                                     │ (ALS context active for the whole async chain)
              ┌──────────────────────┼────────────────────────┐
              ▼                      ▼                        ▼
        logger.info({...})    use-case calls        httpClient.get(url)
        reads ALS ctx →       DomainError thrown    interceptor reads ALS →
        line has reqId,       → error mw logs       sets X-Request-Id header,
        userId                with same reqId       logs outbound call
```

- **Single log instance**, configured once in `infra/logger/pino.ts`.
- **Child logger per request**, created in middleware, bound to the ALS store. Application code imports `logger` from `infra/logger/logger.ts`; that export is a thin proxy that merges ALS context at call time.
- **Outbound correlation:** the BE axios interceptor pulls `reqId` from ALS and sets it as `X-Request-Id` on outbound requests — so a downstream service's logs (if any) can be joined to the originating request.
- **Levels:** `error` for 5xx and unexpected exceptions; `warn` for 4xx domain errors (authz denials, conflicts); `info` for request summary (method, path, status, durationMs, userId); `debug` for outbound HTTP and parser details.
- **No PII in logs:** document content is never logged; only ids, sizes, and statuses.

---

## 11. Deployment Topology

### 11.1 Local (Docker Compose — primary)
```
┌──────────────────────────────────────────────────────────────┐
│ docker compose up                                            │
│                                                              │
│   ┌────────┐    ┌────────┐    ┌────────────┐                 │
│   │ web    │──► │ api    │──► │ postgres   │                 │
│   │ :3000  │    │ :3001  │    │ :5432      │                 │
│   │ Next   │    │ Hono   │    │ (volume)   │                 │
│   └────────┘    └────────┘    └────────────┘                 │
│       │                                                          │
│       └─ /api/* proxied to api:3001 (or direct, depending on env) │
└──────────────────────────────────────────────────────────────┘
```
- The API runs `prisma migrate deploy && node dist/main.js` on boot.
- `docker-compose.override.yml` adds hot reload for dev.
- `.env.example` documents `DATABASE_URL`, `LOG_LEVEL`, `MAX_UPLOAD_BYTES`, `CORS_ORIGIN`.

### 11.2 Production (Render)
```
┌──────────────────────────────────────────────┐
│ Render                                        │
│   ┌────────────┐    ┌────────────────────┐    │
│   │ web (Next) │──► │ api (Hono, Node)   │    │
│   └────────────┘    └─────────┬──────────┘    │
│                               │                │
│                     ┌─────────▼──────────┐    │
│                     │ managed Postgres   │    │
│                     └────────────────────┘    │
└──────────────────────────────────────────────┘
```
- Two web services + managed Postgres. Free/hobby tier — reviewers pay nothing.
- API service env: `DATABASE_URL` (Render-injected), `CORS_ORIGIN` = web URL.
- Migrations run as a Render deploy hook (or on boot).
- Seed idempotent on boot.

### 11.3 Parity guarantees
- Same Postgres major version locally and in prod (image pinned).
- Same env vars (validated by the same zod schema).
- Same build artifacts (`pnpm -r build`).

---

## 12. Build & Delivery Plan (sequence)

| Step | Outcome | Rough time |
|---|---|---|
| 1. Scaffold | pnpm workspaces; `apps/web` (Next+Tailwind), `apps/api` (Hono), `packages/shared`; tsconfig, eslint, prettier, vitest wired; `docker-compose.yml` bringing up postgres + api + web. | 0.75h |
| 2. Schema + migrations + seed | Prisma models (`User`, `Document` w/ `version`, `Share`); seed Alice/Bob/Carol. | 0.5h |
| 3. Cross-cutting infra | `request-context` (ALS), `logger` (pino+ALS), BE axios instance, error middleware, current-user middleware. | 0.75h |
| 4. `content` + `docs` domain (pure) | `sanitize`, `authorization`, `merge` — with unit tests. | 0.75h |
| 5. Repos + use-cases + routes for docs | CRUD + authz + optimistic concurrency; FE axios + TanStack Query + minimal `<DocumentList>` + `<Editor>` (textarea first). | 1h |
| 6. **Deploy early** to Render (web + api + PG). | 0.5h |
| 7. Tiptap integration | B/I/U, headings, lists, toolbar, autosave indicator, shortcuts. | 1h |
| 8. Sharing | `shares` module, `<ShareDialog>`, owned/shared split, `<AccessDenied>`. | 0.75h |
| 9. Import | `.md` + `.txt` (must), `.docx` (should); size/type guards. | 0.75h |
| 10. Tests | Pure-core unit (done inline at step 4), API integration via testcontainers, 1 Playwright sharing flow. | 0.75h |
| 11. Polish | empty states, toasts, a11y labels, 409 UX, error mapping review. | 0.5h |
| 12. Docs | README, ARCHITECTURE, AI_WORKFLOW, SUBMISSION, walkthrough video. | 0.75h |

**First cuts if time runs short:** drop `.docx` (keep `.md`/`.txt`), then drop Playwright (keep pure-core + API integration tests). Never cut core editing, sharing, persistence, or the pure domain layer.

---

## 13. Testing Strategy (architectural view)

(Requirements-side detail in `TECH_SPEC.md` §12.)

```
Vitest — unit (pure core, no DB)          Vitest — integration (testcontainers PG)
├─ content/sanitize                         ├─ DocumentRepository (version bump, cascade)
│   • allowlist keeps known nodes/marks     ├─ docs-api (authz: owner/grantee/stranger)
│   • strips <script>/unknown               ├─ docs-api (concurrency: 409 on stale version)
├─ docs/authorization                       ├─ shares-api (grant/revoke, 409 dup, 403 non-owner)
│   • owner/grantee/stranger matrix         ├─ import-api (413 size, 415 type, happy path md/txt)
├─ docs/merge                               └─ helpers/{db,http}.ts (spin up PG, build app)
│   • version mismatch → ConflictError
│   • empty title → "Untitled"            Playwright — 1 e2e
│   • immutability (input not mutated)      Full sharing flow: Alice creates → shares → Bob
└─ import/rules                             sees & edits → Alice sees edit on refocus.
    • size/type derivation
```

- Pure-core tests run in milliseconds and execute on every save — they are the primary correctness gate.
- Integration tests spin a fresh Postgres via testcontainers; no shared state.
- The Playwright test is the smoke test that the whole system (FE axios + TanStack Query + API + DB + authz) hangs together.

---

## 14. Open Questions (to resolve during build)

1. **Web↔API wiring in dev:** proxy `/api/*` from Next to the API container, or call the API directly cross-origin? Direct (with CORS) is simpler to reason about; proxy avoids CORS. Decide at scaffold time.
2. **pnpm vs npm for reviewers:** pnpm is the dev choice; README documents the npm fallback (`npm run ...` works because of workspace root scripts).
3. **`.docx` depth:** simple docs only; tables/images dropped with a visible note. Timebox strictly.
4. **Turbo vs npm scripts:** Turbo is nice-to-have; if it costs more than 15 minutes, plain workspace scripts win.
5. **Stretch pickup order** (only if core is done with time left): (a) export to Markdown, (b) viewer role + `Role` enum expansion, (c) version history (the `version` column already gives us the spine), (d) realtime presence (the pure `merge` already gives us the authority). Listed by value-per-hour.

---

## 15. Glossary

- **Anemic tactical DDD** — tactical DDD with data-only entities and pure-function domain services, grouped into bounded modules.
- **Pure function** — output depends only on inputs; no side effects; no argument mutation.
- **ALS (AsyncLocalStorage)** — Node API for request-scoped context that flows across `await` without explicit threading.
- **Optimistic concurrency** — each row carries a `version`; stale writes rejected with 409.
- **Use-case** — application-layer orchestrator: load → call pure domain fn → persist; the only place transactions live.
- **ReqId / correlation id** — per-request UUID in every log line and every outbound `X-Request-Id`.
- **Tiptap JSON** — ProseMirror document as JSON; the authoritative content format.

---

## 16. Traceability to Requirements

| NFR / FR cluster | HLD mechanism |
|---|---|
| Authorization (FR-4.4, NFR-5) | Pure `docs/authorization.ts` called from every use-case; backstopped by route-level `current-user` middleware; API-integration tested. |
| Concurrency correctness (FR-1.4, NFR-3) | Pure `docs/merge.ts` + DB `version` WHERE-clause (ADR-005); 409 handled in the FE mutation. |
| XSS safety (NFR-4) | Pure `content/sanitize.ts` on every write (ADR-008); allowlist, not blocklist. |
| Observability (FR-7, NFR-12) | pino + ALS (ADR-006); axios interceptor propagates `reqId`. |
| Ship fast (timebox) | Two-service split with mature libs; `docker compose up` (ADR-001/002/003). |
| Production parity (FR-6, NFR-8) | Postgres everywhere; pinned image; env-validated config. |
| Meaningful test (NFR-7) | Pure-core unit tests + API integration + 1 Playwright (§13). |
| Maintainability (NFR-6, NFR-11) | Strict layering; anemic pure domain; shared zod contracts. |
| HTTP clients (NFR-13) | axios both sides; TanStack Query on FE (ADR-007). |
