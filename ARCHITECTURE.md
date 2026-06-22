# Architecture

## Overview

Ajaia Docs is a two-service web application following an **anemic tactical DDD** pattern on the backend.

## Key Design Decisions

### 1. Two-Service Split
- **`apps/web`**: Next.js (App Router) — UI only
- **`apps/api`**: Hono on Node — pure API
- They communicate over HTTP via axios
- Clean separation allows independent deployment and testing

### 2. Anemic Tactical DDD
The backend follows DDD building blocks but keeps entities **data-only**. Business rules live in **pure functions**:

- `docs/authorization.ts` — pure `canRead`, `canWrite`, `canManage`
- `docs/merge.ts` — pure `applyUpdate` (optimistic concurrency authority)
- `content/sanitize.ts` — pure allowlist walk (XSS prevention)
- `import/rules.ts` — pure `validateUpload`, `deriveTitle`

**Why pure functions?**
1. **Testability** — tested with a single `import`, no DB or mocks needed
2. **Correctness** — concurrency logic can be exhaustively unit-tested
3. **Future reuse** — the same merge function becomes the server-side authority for realtime collaboration

### 3. Strict Layering
```
Presentation (Hono routes)
    ↓
Application (use-cases)
    ↓
Domain (pure functions)
    ↑
Infrastructure (repos, logger, HTTP)
```

Dependencies point downward. The domain layer depends on **nothing** — no Prisma, no Hono, no axios.

### 4. Optimistic Concurrency
Each `Document` carries a `version` counter:
1. Client sends the version it last loaded on PATCH
2. Pure `applyUpdate` checks version match (returns `ConflictError` if stale)
3. Repo's `update` also checks version in WHERE clause (DB backstop)
4. On 409, client refetches and shows "edited elsewhere" toast

### 5. Observability via AsyncLocalStorage
- Per-request `reqId` generated in middleware
- Flows through all log calls automatically (no context threading)
- Propagated to outbound HTTP via axios interceptor

## Module Map

```
apps/api/src/
├── main.ts                    # Boot, middleware wiring, seed
├── config.ts                  # Zod-validated env
├── middleware/                 # request-context, error, current-user
├── modules/
│   ├── content/               # Shared pure core (sanitize, types)
│   ├── docs/                  # Documents (CRUD + authz + merge)
│   ├── shares/                # Share grants
│   ├── import/                # File upload → new doc
│   └── users/                 # User lookup
├── infra/                     # Prisma, pino logger, axios
└── seed/                      # Seed data
```

## Data Model

- **User**: id, name, email, color
- **Document**: id, title, content (Tiptap JSON), ownerId, version, timestamps
- **Share**: id, documentId, granteeId, role (EDITOR), unique(docId, granteeId)

## Testing Strategy

- **Pure core unit tests** (30 tests) — authorization, merge, sanitize, import rules
- No DB required for core logic testing
- Integration tests with testcontainers Postgres (planned)

## What Was Prioritized

1. **Correctness** — pure domain functions for authz and concurrency
2. **Core editing** — Tiptap with B/I/U/headings/lists, autosave
3. **Sharing** — owner/grantee model with visual distinction
4. **Import** — .md and .txt parsing to Tiptap JSON
5. **Observability** — correlated logs via ALS

## What Was Intentionally Deprioritized

- Real-time collaboration (pure merge core is shaped for future)
- Real authentication (simulated via cookie/user-switcher)
- Viewer role (only editor in v1)
- Document version history
- .docx import (stretch, may be partial)
