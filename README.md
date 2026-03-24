# Curator's Eye

Curator's Eye is an image-based art trivia game built on top of The Metropolitan Museum of Art Open Access data. It combines a **Fastify + MySQL** backend with a **React + Vite** frontend, and now includes richer quiz content, post-answer educational context, and analytics views.
 
## What the project does

Players log in, answer image-based multiple-choice questions about artworks, and view leaderboard results. The game uses MET collection metadata plus enrichment datasets such as art periods, countries, wines, food pairings, and wars/conflicts.

## Main features

- User authentication with sessions and cookies
- Image-based quiz rounds using MET artwork images
- Multiple question types beyond the original department/culture quiz
- Artwork image caching from the MET API into MySQL
- Post-answer **Curator's Note / enrichment** panel
- Analytics dashboard with cross-domain views such as art + wine and art + history
- Leaderboard and session summary views

## Current question types

The project now supports these quiz types:

- **department** — Which museum department is this artwork associated with?
- **culture** — Which culture is this artwork associated with?
- **art_period** — Which art period is associated with this artwork / its origin?
- **wine_region** — Which wine region is associated with the artwork's related country/origin?
- **food_pairing** — Which food pairing best matches the related wine/country context?
- **sommelier** — Which wine would best pair with this artwork?
- **war_conflict** — Which war or conflict is historically associated with the artwork's place/time context?
- **artwork_name** — What is the name of this artwork?
- **artist_nationality** — What is the nationality of the artist who created this artwork?

## Important UI behavior

- Quiz rounds that depend on artwork images require a valid MET image
- For the **artwork_name** question, the artwork title is intentionally **hidden beneath the image** so the answer is not revealed
- Images are fetched from the MET API and cached after the first successful lookup

## Enrichment

After answering a question, the app can show a **Curator's Note** panel with extra context, for example:

- artwork details
- artist information
- country / culture context
- art period context
- wine / food pairing context
- war / conflict context

This is meant to make the game feel more educational and less like a simple right/wrong quiz.

## Analytics

The project also includes analytics endpoints and frontend views for richer exploration of the data, including areas such as:

- wine and art relationships
- food pairings
- art periods and geography
- war/conflict overlap
- leaderboard and player statistics
- difficulty / performance by category or period

## Project structure

- `apps/backend` — Fastify API, services, question generators, ETL helpers
- `apps/frontend` — React application and UI components
- `data/` — datasets used by the project
  - `data/met/` — MET datasets
  - `data/historical/` — art periods, countries, wars/battles
  - `data/users/` — generated users CSV
  - `data/wines/` — wine data and wine-food pairing data
- `db_setup/` — SQL scripts for schema creation and data loading
- `docs/` — project notes and complex query documentation

## Tech stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Fastify, TypeScript
- **Database:** MySQL 8
- **Data sources:** MET Open Access + supplemental historical / wine datasets

## Requirements

- Node.js >= 18
- MySQL 8.0+
- Git LFS recommended for large tracked assets
- The wine dataset file used by `db_setup/09_load_wines.sql`

## Database setup notes

### Important
Use the schema from:

- `db_setup/01_schema.sql`

and **not only** `apps/backend/db/schema.sql` if you want the full extended project, because the full setup includes the extra tables used by features such as wars/conflicts and analytics.

### Expected SQL flow

Recommended order:

1. `db_setup/00_create_database.sql`
2. `db_setup/01_schema.sql`
3. `db_setup/02_load_users.sql`
4. `db_setup/03_load_artists.sql`
5. `db_setup/04_load_artworks.sql`
6. `db_setup/05_load_art_periods.sql`
7. `db_setup/06_map_artwork_periods.sql`
8. `db_setup/07_load_countries.sql`
9. `db_setup/08_map_culture_country.sql`
10. `db_setup/09_load_wines.sql`
11. `db_setup/10_load_wine_food_pairings.sql`
12. `db_setup/12_load_wars.sql`

`db_setup/11_add_performance_indexes.sql` may be unnecessary if those indexes already exist in the schema you created.

### Dataset caveats

- `MetObjects_update.csv` must be the **real CSV file**, not a Git LFS pointer text file
- The wines import expects the wine dataset required by `db_setup/09_load_wines.sql`
- If artworks, artwork-period mappings, or culture-country mappings are unexpectedly low, verify that the MET CSV actually contains data and was imported correctly

## Quick start

### 1. Install dependencies

From the repo root:

```bash
npm install
cd apps/backend && npm install
cd ../frontend && npm install
```

### 2. Configure backend env

Copy:

```bash
apps/backend/.env.example
```

to:

```bash
apps/backend/.env
```

Then set your MySQL connection details.

Example values used during development:

```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
MYSQL_URL=mysql://root:YOUR_PASSWORD@127.0.0.1:3307/curators_eye
SESSION_SECRET=change-me
```

### 3. Prepare MySQL

- Enable `LOCAL INFILE`
- Create the database
- Run the schema
- Load the datasets in the order shown above

### 4. Run the apps

Backend:

```bash
cd apps/backend
npm run dev
```

Frontend:

```bash
cd apps/frontend
npm run dev
```

Frontend default URL:

```text
http://localhost:5173
```

## Troubleshooting

### Login stopped working after rebuilding the DB
If the database was recreated, previously registered users and sessions may have been wiped. Reload the users dataset and log in again with an existing user from `data/users/users_data.csv`, or register a new user.

### Wine / wars sections show no data
Usually this means one of the related tables was not loaded correctly:

- `wine`
- `wine_food_pairing`
- `war_battle`
- `country`
- `culture_country`
- `artwork_period`

### Only a tiny number of artworks loaded
Check that `data/met/MetObjects_update.csv` is the real dataset and not a Git LFS pointer file.

## Notes

- Some original MET metadata fields are noisy, especially culture-like labels
- Question quality depends heavily on dataset cleanliness and mappings
- The app is designed for educational gameplay, not strict art-historical certainty in every generated option
