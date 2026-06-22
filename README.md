# Ajaia Docs

A lightweight, collaborative rich-text document editor inspired by Google Docs.

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (optional, for local Postgres)

### Option 1: Docker Compose (Recommended)

```bash
docker compose up
```

This starts:
- **PostgreSQL** on port 5432
- **API** (Hono) on port 3001
- **Web** (Next.js) on port 3000

Open http://localhost:3000 in your browser.

### Option 2: Manual Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start a PostgreSQL instance (Docker or local):
   ```bash
   docker run -d --name ajaia-pg -e POSTGRES_DB=ajaia -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
   ```

3. Set up environment:
   ```bash
   cp .env.example apps/api/.env
   ```

4. Run migrations and seed:
   ```bash
   cd apps/api
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Start both apps:
   ```bash
   pnpm dev
   ```

## Seeded Users

The app comes with 3 pre-seeded users for demo purposes:

| User | Email | Color |
|------|-------|-------|
| Alice | alice@ajaia.dev | Red |
| Bob | bob@ajaia.dev | Blue |
| Carol | carol@ajaia.dev | Green |

Use the user switcher in the top-right to switch between users.

## Features

- **Rich-text editing** with Tiptap (bold, italic, underline, headings, lists)
- **Autosave** with debounced saves and status indicator
- **Sharing** — owner can grant editor access to other users
- **File import** — upload `.md`, `.txt`, or `.docx` files
- **Optimistic concurrency** — concurrent edits detected with 409 conflict
- **Correlated logging** — pino + AsyncLocalStorage for request tracing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Tiptap, TanStack Query, axios |
| Backend | Hono, TypeScript, Prisma, PostgreSQL |
| Testing | Vitest (30 unit tests) |
| Infrastructure | Docker Compose, pnpm workspaces |

## Project Structure

```
ajaia-docs/
├── apps/
│   ├── api/          # Hono backend (anemic tactical DDD)
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared types and zod schemas
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/users | List users |
| GET | /api/users/me | Current user |
| GET | /api/docs | List visible documents |
| POST | /api/docs | Create document |
| GET | /api/docs/:id | Get document |
| PATCH | /api/docs/:id | Update document |
| DELETE | /api/docs/:id | Delete document |
| POST | /api/docs/:id/shares | Grant access |
| DELETE | /api/docs/:id/shares/:userId | Revoke access |
| POST | /api/import | Import file |

## Testing

```bash
cd apps/api
npx vitest run
```

30 unit tests covering:
- Authorization logic (owner/grantee/stranger matrix)
- Optimistic concurrency (version mismatch, empty title)
- Content sanitization (XSS prevention, allowlist enforcement)
- Import rules (size limits, extension validation)
