# Truck Fit Calculator

An internal tool for the warehouse/office to check whether a mix of product quantities fits in a standard 53' trailer, with capacity math based on full-stack loading rules.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/truck-builder/` — web frontend (calculator at `/`, item management at `/items`)
- `artifacts/api-server/src/routes/items.ts` — item type CRUD
- `artifacts/api-server/src/routes/loads.ts` — load fit calculation (single source of business logic)
- `lib/db/src/schema/items.ts` — items table
- `lib/api-spec/openapi.yaml` — API contract (codegen source of truth)

## Capacity rules

- Truck: standard 53' trailer, loaded in FULL stacks only; quantities round UP to full stacks.
- Half Pack: 68 stacks of 10 (680/truck); Full Pack: 34 stacks of 10 (340/truck); Bags: 34 stacks of 11 (374/truck).
- Mixed loads: each item's stacks consume stacksNeeded/stacksPerTruck of a truck; fits when combined ≤ 100%.
- Items can be derived via relationships (e.g. 1 Pallet = 20 Half Pack): capacity is derived live from the FIRST relationship's base item. Base items must be direct (no chains), can't be deleted while in use, and can't become derived while others depend on them.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The api-spec codegen script rewrites the generated zod import to `zod/v4` (orval emits zod v4 API); don't remove the sed step in `lib/api-spec/package.json`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
