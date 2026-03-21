# Database Setup (MySQL)

**Preferred method:** Run `bash scripts/setup_db.sh` from the repo root. It handles all steps below automatically.

If you prefer to run steps manually, execute each command from the **repository root**. Replace `mysql` with the full path to your MySQL binary if it's not on your PATH.

## 1) Enable LOCAL INFILE
```bash
mysql -u root -p -e "SET GLOBAL local_infile = 1;"
```

## 2) Create DB
```bash
mysql -u root -p < db_setup/00_create_database.sql
```

## 3) Create tables
```bash
mysql -u root -p curators_eye < db_setup/01_schema.sql
```

## 4) Load users
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/02_load_users.sql
```

## 5) Load artists
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/03_load_artists.sql
```

## 6) Load artworks
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/04_load_artworks.sql
```

## 7) Load art periods
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/05_load_art_periods.sql
```

## 8) Map artworks to periods
```bash
mysql -u root -p curators_eye < db_setup/06_map_artwork_periods.sql
```

## 9) Load countries
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/07_load_countries.sql
```

## 10) Map cultures to countries
```bash
mysql -u root -p curators_eye < db_setup/08_map_culture_country.sql
```

## 11) Load wines
Download `winemag-data-130k-v2.csv` from [Kaggle Wine Reviews](https://www.kaggle.com/datasets/zynicide/wine-reviews) and place it in `data/wines/`.
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/09_load_wines.sql
```

## 12) Load wine food pairings
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/10_load_wine_food_pairings.sql
```

## 13) Add performance indexes
```bash
mysql -u root -p curators_eye < db_setup/11_add_performance_indexes.sql
```

## 14) Load wars & battles
```bash
mysql --local-infile=1 -u root -p curators_eye < db_setup/12_load_wars.sql
```

## 15) Verify
```bash
mysql -u root -p curators_eye < db_setup/99_verify.sql
```

## 16) Backend
```bash
cd apps/backend
cp .env.example .env
# Edit .env with your MySQL credentials
npm run dev
```

## 17) Frontend
Open a new terminal:
```bash
cd apps/frontend
npm run dev
```

## Notes
- All `LOAD DATA LOCAL INFILE` paths in the SQL files are relative to the repo root.
- Images are fetched on demand from the public MET API and cached in the database.
- If using a non-default port, add `-P <port>` to each mysql command.
