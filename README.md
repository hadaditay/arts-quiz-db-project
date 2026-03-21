# Curator's Eye

Art trivia game powered by MET collection data, a Fastify + MySQL backend, and a React frontend.

## Main features
- Sign in / sign up with username, password, first name, and last name
- Home screen with a **"התחל לשחק"** button
- Exit button inside the game
- Skip button for moving to the next round
- Image-based rounds for supported question types
- Image URLs are fetched from the public MET API on first use and cached in MySQL

## Current question types
- department
- culture

Both current question types require an image. The backend only selects artworks that can resolve an image through the MET API cache flow.

## Project layout
- `apps/backend` — Fastify API and ETL scripts
- `apps/frontend` — React (Vite) frontend
- `data/met/` — Met museum CSVs (artworks, artists) — large file via Git LFS
- `data/wines/` — wine food pairing CSV (wine reviews CSV must be downloaded separately)
- `data/historical/` — art periods, countries, wars/battles CSVs
- `data/users/` — user data CSV and generator script
- `db_setup/` — SQL scripts to create and populate the database
- `scripts/` — helper scripts (DB setup)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | >= 18 | [nodejs.org](https://nodejs.org/) |
| **npm** | (bundled with Node) | Workspaces support required |
| **MySQL** | 8.0+ | [mysql.com/downloads](https://dev.mysql.com/downloads/mysql/) |
| **Git LFS** | any | [git-lfs.com](https://git-lfs.com/) — needed to pull the large MET CSV |

### Optional data
- **Wine reviews CSV** — download `winemag-data-130k-v2.csv` from [Kaggle Wine Reviews](https://www.kaggle.com/datasets/zynicide/wine-reviews) and place it in `data/wines/`. Wine-related question types won't work without it.

---

## Quick Start

### 1. Clone the repo

```bash
git clone <repo-url>
cd arts-quiz-db-project
```

If you see a ~50 MB `MetObjects_update.csv` that is only a pointer file, pull the real data:

```bash
git lfs install
git lfs pull
```

### 2. Install Node dependencies

```bash
npm install
```

This installs both backend and frontend dependencies via npm workspaces.

### 3. Set up MySQL database

Make sure your MySQL server is running, then from the **repo root**:

```bash
bash scripts/setup_db.sh
```

The script will:
- Prompt for your MySQL password (press Enter if none)
- Create the `curators_eye` database
- Create all tables
- Load all CSV data (users, artists, artworks, art periods, countries, wars)
- Load wine data if the Kaggle CSV is present (skips gracefully if not)
- Add performance indexes
- Print row counts to verify

You can customize the connection with env vars:

```bash
MYSQL_USER=myuser MYSQL_PORT=3307 bash scripts/setup_db.sh
```

### 4. Configure the backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` and set:
- `MYSQL_PORT` — your MySQL port (default 3306)
- `MYSQL_PASSWORD` — your MySQL password
- `SESSION_SECRET` — any random string

### 5. Start the app

In two terminals (or use `&`):

```bash
# Terminal 1 — backend (runs on port 4000)
npm run dev:backend

# Terminal 2 — frontend (runs on port 5173)
npm run dev:frontend
```

Open http://localhost:5173 in your browser.

---

## All-in-one copy-paste (macOS / Linux)

```bash
git clone <repo-url>
cd arts-quiz-db-project
git lfs pull
npm install
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your MySQL credentials
bash scripts/setup_db.sh
npm run dev:backend &
npm run dev:frontend
```

## Windows

The same steps apply. Use `mysql` from your MySQL installation directory or add it to your PATH. The setup script requires Git Bash or WSL:

```bash
bash scripts/setup_db.sh
```

Or run each SQL file manually with `mysql`:

```cmd
mysql -u root -p < db_setup/00_create_database.sql
mysql -u root -p curators_eye < db_setup/01_schema.sql
mysql --local-infile=1 -u root -p curators_eye < db_setup/02_load_users.sql
:: ... continue with 03 through 12 in order
```

---

## Other commands

```bash
npm run build          # Build both frontend and backend
npm run lint           # Lint both workspaces
npm run test           # Run tests in both workspaces
npm run dev:backend    # Start backend in dev mode
npm run dev:frontend   # Start frontend in dev mode
```

## Notes
- Images are fetched on demand from the public MET API and cached in the database. The first request for an artwork image may be slightly slower.
- The SQL `LOAD DATA LOCAL INFILE` statements use relative paths — always run them from the repo root.
- The `data/met/MetObjects_update.csv` (~50 MB) is stored with Git LFS. Make sure `git lfs` is installed before cloning.
