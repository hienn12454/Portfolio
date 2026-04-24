# Portfolio FE

## Run

1. Copy `.env.example` to `.env.local`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## API backend config

- Local development: set `VITE_API_BASE_URL` in `.env.local` (example: `http://localhost:5000`)
- Production build: this repo includes `.env.production` with:
  - `VITE_API_BASE_URL=https://portfoliobe.azurewebsites.net`

## Clerk auth

- Uses `@clerk/react` with `ClerkProvider` in `src/main.jsx`
- Required env var for Vite:
  - `VITE_CLERK_PUBLISHABLE_KEY`
- Optional deploy note (Azure): set `VITE_CLERK_PUBLISHABLE_KEY` in the build environment so Vite can embed it at build time.

## Frontend architecture

- `src/core`: shared technical utilities (HTTP client, etc.)
- `src/projects/domain`: domain model mapping
- `src/projects/application`: use-cases
- `src/projects/infrastructure`: API repositories
- `src/projects/presentation`: React pages/components/hooks
