# Curator's Eye

Met-powered art quiz game with a Fastify/MySQL backend and a React (Vite) frontend. Shows the small Met image first, preloads the high-res version, and supports full-screen zoom. Username-only auth with session cookies, extensible question types, and all-time leaderboard.

## Stack
- Frontend: React + Vite + TypeScript, React Query, React Router, CSS Modules.
- Backend: Fastify + TypeScript, MySQL (mysql2), zod validation.
- Data: local Met CSV ingested via Node ETL into MySQL.

## Project layout
- `apps/backend` — API server, ETL, MySQL schema.
- `apps/frontend` — Vite app.
- `data/met/MetObjects.csv` — place the Met CSV here (override with `MET_CSV_PATH`).
- `apps/backend/db/schema.sql` — schema for MySQL.

## Setup
1) Install dependencies
```bash
npm install
```

2) Database
- Create a MySQL database (default name `curators_eye`).
- Apply schema: `mysql -uUSER -p curators_eye < apps/backend/db/schema.sql`.

3) Environment
- Copy `apps/backend/.env.example` to `apps/backend/.env` and adjust MySQL credentials, session secret, and CORS origin.
- Ensure the Met CSV is available at `data/met/MetObjects.csv` (or set `MET_CSV_PATH`).

4) ETL (load Met data)
```bash
npm --workspace apps/backend run etl
```
This ingests public-domain rows from the CSV, computes a simple era bucket, and upserts into `met_artwork`. Image URLs are fetched on-demand later if missing.

5) Run dev servers
```bash
npm --workspace apps/backend run dev   # API on :4000
npm --workspace apps/frontend run dev  # Web on :5173
```

## Docker (optional)
- Build/start MySQL + API + frontend: `docker compose up --build` (ports: API `4000`, web `5173`, MySQL exposed on host `3307` to avoid conflicts).
- Default DB creds from compose: database `curators_eye`, user `curator` / password `curator`, root password `devroot`.
- Place the Met CSV at `data/met/MetObjects.csv` (or `MetObjects_update.csv` and set `MET_CSV_PATH`); it is mounted into containers at `/app/data` for ETL.
- Load data (only needed on a fresh DB volume or if you swap the CSV):  
  `docker compose run --rm backend npm --workspace apps/backend run etl`  
  This uses `MET_CSV_PATH` (default `/app/data/met/MetObjects_update.csv` in compose).
- DB data persists in the `mysql_data` volume; you don’t need to rerun ETL unless you remove that volume or change the CSV.
- Adjust ports/credentials or the baked API URL via `docker-compose.yml` (frontend build arg `VITE_API_BASE_URL`).
- Backend in compose runs with `NODE_ENV=development` so cookies work over HTTP during local use.
- ETL does not call the Met API. When a round needs an artwork without stored image URLs, the backend fetches the image URLs on-demand from the Met API at question time.

## API (initial)
- `POST /api/auth/login` — body `{ username }`, sets session cookie.
- `GET /api/auth/me` — current session.
- `GET /api/rounds/next` — generate a round (prefetch-friendly). Optional `?type=department|culture|era|medium`.
- `POST /api/rounds/:id/answer` — body `{ selected }`, scores and updates leaderboard.
- `GET /api/leaderboard/all-time` — top users.

## Question system
- Current types: department, culture, era, medium (image-backed).
- Add new types by creating a generator under `apps/backend/src/question/` and registering it in `registry.ts`.

## Frontend behavior
- Prefetches the next round in the background.
- Loads `primaryImageSmall` first, preloads `primaryImage` and swaps when ready.
- Full-screen modal with zoom controls for large images.
- Leaderboard fetched with React Query.

## Notes
- Username-only auth; one user at a time is assumed, but leaderboard supports multiples.
- No daily challenge; all-time leaderboard only.
- All code is TypeScript; builds succeed for both apps (`npm run build --workspaces`).
