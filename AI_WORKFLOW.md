# AI Workflow Note

## Tools Used

- **Opencode** — implementation-time questions, quick lookups, writing docs
- **Copilot** — tab autocomplete during active coding, writing repetitive code and basic code

---

## Where AI Materially Sped Up Work

1. **Boilerplate generation** — scaffolded pnpm workspace configs, Docker Compose, tsconfig, and package.json files in one pass
2. **Hono route handlers** — repetitive CRUD routes with Zod validation generated quickly, then reviewed and trimmed
3. **Tiptap integration** — editor component with toolbar, autosave, and keyboard shortcuts scaffolded from the library docs
4. **Test stubs** — generated the structure of unit tests for pure domain functions; logic and assertions written manually
5. **Documentation** — README, architecture note, and inline JSDoc drafted with AI, then edited for accuracy and tone

---

## What AI-Generated Output Was Changed or Rejected

1. **Import paths** — initially generated relative paths (`../../../shared/errors.js`) that broke across workspace boundaries; switched to the `shared` package alias manually
2. **Hono context types** — AI didn't set up `ContextVariableMap`, so `c.var.user` wasn't typed correctly; added the declaration by hand
3. **tsconfig rootDir** — generated config excluded the shared package from compilation; fixed by setting `rootDir` to the monorepo root
4. **Vitest config** — AI missed the path alias for the `shared` package; added it to `vitest.config.ts` manually

---

## How Correctness Was Verified

1. **Unit tests** — written manually against pure domain functions; AI-generated stubs were a starting point, not the final test
2. **Type checking** — `tsc --noEmit` passes cleanly across all workspace packages
3. **Manual testing** — ran through the authorization matrix, sharing flows, and editor round-trips by hand

---

## Overall Stance

AI handled the mechanical parts — boilerplate, repetitive patterns, and first-draft documentation. Architecture, domain logic, and debugging were done without AI input. Every generated file was read before being committed; the config and type errors above were caught in that review pass.