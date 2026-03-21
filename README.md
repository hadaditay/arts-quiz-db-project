# Curator's Eye

Art trivia game powered by MET collection data, a Fastify + MySQL backend, and a React frontend.

## Main features
- Sign in / sign up with username, password, first name, and last name
- Home screen with a **"התחל לשחק"** button
- Exit button inside the game
- Skip button for moving to the next round
- Image-based rounds for supported question types
- Image URLs are **not loaded from CSV**. Instead, the backend fetches them from the public MET API the first time an artwork is needed, then caches them in MySQL:
  - `primary_image`
  - `primary_image_small`
  - `image_checked`

## Current question types
- department
- culture

Both current question types require an image. The backend only selects artworks that can resolve an image through the MET API cache flow.

## Project layout
- `apps/backend` — backend API and ETL scripts
- `apps/frontend` — frontend application
- `data/met/` — Met museum CSVs (artworks, artists)
- `data/wines/` — wine reviews and food pairing CSVs
- `data/historical/` — art periods, countries, wars/battles CSVs
- `data/users/` — user data CSV and generator script
- `apps/backend/db/schema.sql` — MySQL schema
- `db_setup/` — SQL setup / load scripts

## Run overview
1. Enable `local_infile`
2. Create DB
3. Create tables
4. Load users
5. Load artists
6. Load artworks
7. Start backend
8. Start frontend

For the exact commands, see `db_setup/README.md`.
