#!/usr/bin/env bash
#
# Sets up the curators_eye MySQL database from scratch.
# Run from the repository root:  bash scripts/setup_db.sh
#
# Accepts optional env-vars:
#   MYSQL_USER  (default: root)
#   MYSQL_PORT  (default: 3306)
#   MYSQL_HOST  (default: 127.0.0.1)
#
# If your server requires a password, you will be prompted for each step,
# or you can export MYSQL_PWD beforehand.
set -euo pipefail

MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"

MYSQL_CMD="mysql -u ${MYSQL_USER} -P ${MYSQL_PORT} -h ${MYSQL_HOST}"

# Detect if a password is needed (prompt once, reuse)
if [ -z "${MYSQL_PWD:-}" ]; then
  read -rsp "MySQL password for ${MYSQL_USER} (press Enter if none): " MYSQL_PWD
  echo
  export MYSQL_PWD
fi

echo "==> Enabling LOCAL INFILE..."
$MYSQL_CMD -e "SET GLOBAL local_infile = 1;"

echo "==> Creating database..."
$MYSQL_CMD < db_setup/00_create_database.sql

echo "==> Creating tables..."
$MYSQL_CMD curators_eye < db_setup/01_schema.sql

echo "==> Loading users..."
$MYSQL_CMD --local-infile=1 curators_eye < db_setup/02_load_users.sql

echo "==> Loading artists..."
$MYSQL_CMD --local-infile=1 curators_eye < db_setup/03_load_artists.sql

echo "==> Loading artworks..."
$MYSQL_CMD --local-infile=1 curators_eye < db_setup/04_load_artworks.sql

echo "==> Loading art periods..."
$MYSQL_CMD --local-infile=1 curators_eye < db_setup/05_load_art_periods.sql

echo "==> Mapping artworks to periods..."
$MYSQL_CMD curators_eye < db_setup/06_map_artwork_periods.sql

echo "==> Loading countries..."
$MYSQL_CMD --local-infile=1 curators_eye < db_setup/07_load_countries.sql

echo "==> Mapping cultures to countries..."
$MYSQL_CMD curators_eye < db_setup/08_map_culture_country.sql

# Wine data requires a Kaggle download
if [ -f data/wines/winemag-data-130k-v2.csv ]; then
  echo "==> Loading wines..."
  $MYSQL_CMD --local-infile=1 curators_eye < db_setup/09_load_wines.sql

  echo "==> Loading wine food pairings..."
  $MYSQL_CMD --local-infile=1 curators_eye < db_setup/10_load_wine_food_pairings.sql
else
  echo "!! Skipping wine data (winemag-data-130k-v2.csv not found)."
  echo "   Download from: https://www.kaggle.com/datasets/zynicide/wine-reviews"
  echo "   Place winemag-data-130k-v2.csv in data/wines/ and re-run this script."
fi

echo "==> Adding performance indexes..."
$MYSQL_CMD curators_eye < db_setup/11_add_performance_indexes.sql

echo "==> Loading wars & battles..."
$MYSQL_CMD --local-infile=1 curators_eye < db_setup/12_load_wars.sql

echo ""
echo "==> Verifying row counts..."
$MYSQL_CMD curators_eye < db_setup/99_verify.sql

echo ""
echo "Database setup complete!"
