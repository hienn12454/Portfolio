# Portfolio FE

## Run

1. Copy `.env.example` to `.env.local`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## API backend config

- Local development: set `VITE_API_BASE_URL` in `.env.local` (example: `http://localhost:5000`)
- Production build: this repo includes `.env.production` with:
  - `VITE_API_BASE_URL=https://portfoliobe.azurewebsites.net`
  - Clerk variables should be set from Azure build environment (do not hardcode test keys in repository)

## Clerk auth

- Uses `@clerk/react` with `ClerkProvider` in `src/main.jsx`
- Required env var for Vite:
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `VITE_CLERK_JWT_TEMPLATE` (must match Clerk JWT template name, e.g. `portfoliobe-api`)
- Optional deploy note (Azure): set `VITE_CLERK_PUBLISHABLE_KEY` in the build environment so Vite can embed it at build time.

## Azure FE env setup

- Required app settings for frontend build:
  - `VITE_API_BASE_URL=https://portfoliobe.azurewebsites.net`
  - `VITE_CLERK_PUBLISHABLE_KEY=<your_clerk_publishable_key>`
  - `VITE_CLERK_JWT_TEMPLATE=portfoliobe-api`
  - `VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
  - `VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- Recommended frontend domain for Azure deployment:
  - `https://gray-beach-0ae56a600.7.azurestaticapps.net`
- After adding/changing env vars on Azure, trigger a new deployment so Vite rebuilds with updated values.

## Frontend architecture

- `src/core`: shared technical utilities (HTTP client, etc.)
- `src/projects/domain`: domain model mapping
- `src/projects/application`: use-cases
- `src/projects/infrastructure`: API repositories
- `src/projects/presentation`: React pages/components/hooks
