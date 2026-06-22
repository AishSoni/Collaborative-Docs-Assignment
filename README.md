# Ajaia Docs

A collaborative rich-text editor with sharing, file import, and optimistic concurrency.

## Quick Start

```bash
docker compose up
```

Open http://localhost:3000. Three users are pre-seeded — use the switcher in the top-right to demo sharing.

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

## Tech

| | |
|---|---|
| **Frontend** | Next.js 14, React 18, Tailwind, Tiptap, TanStack Query |
| **Backend** | Hono, Prisma, PostgreSQL 16 |
| **Testing** | Vitest — 29 unit tests on pure domain functions |

## Architecture

Strict layered DDD — dependencies point downward only:

```
routes → use-cases → domain (pure functions) ← infra (Prisma, pino, axios)
```

The domain layer has **zero framework imports**. Authorization, concurrency merge, and content sanitization are pure functions, exhaustively unit-tested with no database needed.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Project Structure

```
apps/
├── api/                # Hono backend
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
| GET | /api/health | Health check |
| GET | /api/docs | List visible documents |
| POST | /api/docs | Create document |
| GET | /api/docs/:id | Get document |
| PATCH | /api/docs/:id | Update document |
| DELETE | /api/docs/:id | Delete document |
| POST | /api/docs/:id/shares | Grant editor access |
| DELETE | /api/docs/:id/shares/:userId | Revoke access |
| POST | /api/import | Import .md, .txt, or .docx |
| GET | /api/users | List users |

## Testing

```bash
cd apps/api && npx vitest run
```

29 tests covering authorization, optimistic concurrency, content sanitization, and import rules — all pure functions, no database required.
