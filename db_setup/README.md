# No-Docker DB Setup (MySQL)

Run everything from the repository root.

## 1) Enable LOCAL INFILE
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3307 -e "SET GLOBAL local_infile = 1;"
```

## 2) Create DB
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3307 < db_setup/00_create_database.sql
```

## 3) Create tables
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3307 curators_eye < apps\backend\db\schema.sql
```

## 4) Load users
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --local-infile=1 -u root -p -P 3307 curators_eye < db_setup/02_load_users.sql
```

## 5) Load artists
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --local-infile=1 -u root -p -P 3307 curators_eye < db_setup/03_load_artists.sql
```

## 6) Load artworks
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --local-infile=1 -u root -p -P 3307 curators_eye < db_setup/04_load_artworks.sql
```

## 7) Load art periods
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --local-infile=1 -u root -p -P 3307 curators_eye < db_setup/05_load_art_periods.sql
```

## 8) Map artworks to periods
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3307 curators_eye < db_setup/06_map_artwork_periods.sql
```

## 9) Load countries
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --local-infile=1 -u root -p -P 3307 curators_eye < db_setup/07_load_countries.sql
```

## 10) Map cultures to countries
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3307 curators_eye < db_setup/08_map_culture_country.sql
```

## 11) Load wines
Download `winemag-data-130k-v2.csv` from [Kaggle Wine Reviews](https://www.kaggle.com/datasets/zynicide/wine-reviews) and place it in `data/wines/`.
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --local-infile=1 -u root -p -P 3307 curators_eye < db_setup/09_load_wines.sql
```

## 12) Load wine food pairings
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --local-infile=1 -u root -p -P 3307 curators_eye < db_setup/10_load_wine_food_pairings.sql
```

## 13) Add performance indexes
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3307 curators_eye < db_setup/11_add_performance_indexes.sql
```

## 14) Optional verify
```bat
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3307 -D curators_eye -e "SELECT COUNT(*) AS users_count FROM game_user; SELECT COUNT(*) AS artists_count FROM artist_profile; SELECT COUNT(*) AS artworks_count FROM met_artwork; SELECT COUNT(*) AS periods FROM art_period; SELECT COUNT(*) AS artwork_periods FROM artwork_period; SELECT COUNT(*) AS countries FROM country; SELECT COUNT(*) AS culture_mappings FROM culture_country; SELECT COUNT(*) AS wines FROM wine; SELECT COUNT(*) AS food_pairings FROM wine_food_pairing;"
```

## 15) Backend
```bat
cd apps\backend
copy .env.example .env
npm install
npm run dev
```

## 16) Frontend
Open a new terminal:
```bat
cd apps\frontend
npm install
npm run dev
```

## Notes
- Images are fetched on demand from the public MET API and cached in the database.
- The CSV does not need to include image URLs.
- First time an artwork is used in an image-based round, the server may take slightly longer because it fetches and caches the image.
