# Workspace

## Overview

pnpm workspace monorepo for **CostForge** — a FinTech + AI cost prediction platform that helps freelancers and small teams choose a confident fixed budget for the AI agent systems they build for clients. Frontend-only React + Tailwind UI for the hackathon demo; the user maintains a separate Django REST Framework backend that will be wired up later.

## Artifacts

- `artifacts/costforge` — React + Vite + Tailwind frontend at `/`. All data is mocked via React context + localStorage so the entire flow is demoable end-to-end (project creation → service selection with LLM suggestions/fuzzy search/registry browse → variant picking with community votes → usage entry → cost prediction).
- `artifacts/api-server` — placeholder Express server at `/api` (not used by the costforge frontend in this build).
- `artifacts/mockup-sandbox` — design canvas sandbox.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
