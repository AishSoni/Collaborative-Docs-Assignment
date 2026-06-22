# Ajaia Docs

A lightweight collaborative document editor built as a two-service monorepo — a **Next.js** frontend and a **Hono** backend — with a shared **pnpm workspace** package for types and contracts.

Users can create, edit, rename, and delete rich-text documents. Documents can be shared with other users as editors. Files in Markdown, plain text, or `.docx` format can be imported as new documents. Concurrent edits are detected via optimistic locking and surfaced as 409 conflicts.

## How It Works

The backend is layered in the style of **anemic tactical DDD**. Dependencies point downward only:

```
routes → use-cases → domain (pure functions) ← infra (Prisma, pino, axios)
```

The domain layer — authorization, content sanitization, and the optimistic-concurrency merge — contains **zero framework imports**. These are plain TypeScript functions that take data in and return data out. They are the most-tested code in the project, exercised by 29 unit tests with no database or mock required.

The infrastructure layer (Prisma repositories, pino logger, axios HTTP client) plugs in from the outside. A single `AsyncLocalStorage` store carries a correlation ID and user ID through every request without explicit parameter threading.

On the frontend, **TanStack Query** manages server state with cache invalidation on mutations. **Tiptap** owns the editor content locally; saves are debounced at 1.5 seconds and fire asynchronously so typing is never blocked. An axios interceptor injects the current user from a cookie and propagates the request ID to the backend.

## Architecture at a Glance

| Layer | What lives here | Framework-dependent? |
|-------|----------------|---------------------|
| **Domain** | `canRead`, `canWrite`, `canManage`, `applyUpdate`, `sanitize` | No — pure functions |
| **Application** | `CreateDoc`, `UpdateDoc`, `GrantShare`, `ImportFile`, etc. | No — orchestrates repos + domain |
| **Infrastructure** | Prisma repos, pino logger, axios client, parsers | Yes — Prisma, pino, mammoth, marked |
| **Presentation** | Hono routes, error middleware, health endpoint | Yes — Hono |

Authorization is a single pure module (`docs/authorization.ts`) called from every document and share use-case. The `Document` entity carries a `version` integer; the merge function rejects stale writes with a `ConflictError`, and the repository double-checks via a `WHERE version = ?` clause so no race can slip through.

Content is stored as **Tiptap JSON**, not HTML. The sanitizer walks the JSON tree against an allowlist of nodes (`doc`, `paragraph`, `heading`, `list`, `text`) and marks (`bold`, `italic`, `underline`). Unknown elements are stripped. This runs on every write — both edits and imports.

## Getting Started

```bash
docker compose up
```

Open http://localhost:3000. Three users (Alice, Bob, Carol) are pre-seeded — use the switcher in the top-right to demo sharing.

<details>
<summary>Manual setup (without Docker Compose)</summary>

```bash
pnpm install
docker run -d --name ajaia-pg -e POSTGRES_DB=ajaia -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
cp .env.example apps/api/.env
cd apps/api && npx prisma migrate dev && npx prisma db seed
pnpm dev
```

</details>

## Project Structure

```
apps/
├── api/                # Hono backend (anemic tactical DDD)
│   ├── src/modules/
│   │   ├── content/    # Tiptap JSON sanitization (pure)
│   │   ├── docs/       # Documents — domain, repo, use-cases, routes
│   │   ├── shares/     # Sharing — domain, repo, use-cases, routes
│   │   ├── import/     # File import — rules, parsers, use-case, route
│   │   └── users/      # Users — repo, use-cases, routes
│   └── tests/unit/     # Vitest specs (pure domain only)
└── web/                # Next.js frontend
    └── src/
        ├── components/ # Editor, Toolbar, ShareDialog, DocumentList
        ├── api/        # TanStack Query hooks
        └── lib/        # Axios client, user helper
packages/shared/        # Result type, DomainError, contracts
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check (DB reachability + seed count) |
| GET | /api/docs | List visible documents (owned + shared) |
| POST | /api/docs | Create document |
| GET | /api/docs/:id | Get document (authz-checked) |
| PATCH | /api/docs/:id | Update document (optimistic lock) |
| DELETE | /api/docs/:id | Delete document (owner only) |
| POST | /api/docs/:id/shares | Grant editor access |
| DELETE | /api/docs/:id/shares/:userId | Revoke access |
| POST | /api/import | Import .md, .txt, or .docx |
| GET | /api/users | List users |

## Testing

```bash
cd apps/api && npx vitest run
```

29 unit tests covering the pure domain layer — authorization matrix, optimistic concurrency, content sanitization, and import rules. No database required.
