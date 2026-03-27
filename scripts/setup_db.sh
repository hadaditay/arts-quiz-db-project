#!/usr/bin/env bash
#
# Sets up the MySQL database from scratch.
# Run from the repository root:  bash scripts/setup_db.sh
#
# Accepts optional env-vars:
#   MYSQL_USER  (default: root)
#   MYSQL_PORT  (default: 3306)
#   MYSQL_HOST  (default: 127.0.0.1)
#   DB_NAME     (default: curators_eye)
#
# If your server requires a password, you will be prompted for each step,
# or you can export MYSQL_PWD beforehand.
set -euo pipefail

MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
DB_NAME="${DB_NAME:-curators_eye}"

MYSQL_CMD="mysql --default-character-set=utf8mb4 -u ${MYSQL_USER} -P ${MYSQL_PORT} -h ${MYSQL_HOST}"

# Detect if a password is needed (prompt once, reuse)
if [ -z "${MYSQL_PWD:-}" ]; then
  read -rsp "MySQL password for ${MYSQL_USER} (press Enter if none): " MYSQL_PWD
  echo
  export MYSQL_PWD
fi

echo "==> Using database: ${DB_NAME}"

echo "==> Creating database (if permitted)..."
if $MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1; then
  echo "    done"
else
  echo "    (skipped — assuming database ${DB_NAME} already exists)"
fi

echo "==> Creating tables..."
$MYSQL_CMD "$DB_NAME" < db_setup/01_schema.sql

# ---- Generate INSERT SQL files from CSVs ----
echo "==> Generating INSERT SQL from CSVs (this may take a moment)..."
PYTHON="${PYTHON:-$(command -v python3 || command -v python)}"
$PYTHON scripts/csv_to_inserts.py

echo "==> Loading users..."
$MYSQL_CMD "$DB_NAME" < db_setup/generated/02_users.sql

echo "==> Loading artists..."
$MYSQL_CMD "$DB_NAME" < db_setup/generated/03_artists.sql

echo "==> Loading artworks (202K rows — may take a few minutes)..."
$MYSQL_CMD "$DB_NAME" < db_setup/generated/04_artworks.sql

echo "==> Loading art periods..."
$MYSQL_CMD "$DB_NAME" < db_setup/generated/05_art_periods.sql

echo "==> Mapping artworks to periods..."
$MYSQL_CMD "$DB_NAME" < db_setup/06_map_artwork_periods.sql

echo "==> Loading countries..."
$MYSQL_CMD "$DB_NAME" < db_setup/generated/07_countries.sql

echo "==> Mapping cultures to countries..."
$MYSQL_CMD "$DB_NAME" < db_setup/08_map_culture_country.sql

# Wine data
if [ -f db_setup/generated/09_wines.sql ]; then
  echo "==> Loading wines..."
  $MYSQL_CMD "$DB_NAME" < db_setup/generated/09_wines.sql

  echo "==> Loading wine food pairings..."
  $MYSQL_CMD "$DB_NAME" < db_setup/generated/10_wine_food_pairings.sql
else
  echo "==> Loading wine food pairings (wine reviews CSV not available)..."
  $MYSQL_CMD "$DB_NAME" < db_setup/generated/10_wine_food_pairings.sql
fi

echo "==> Loading wars & battles..."
$MYSQL_CMD "$DB_NAME" < db_setup/generated/12_wars.sql

echo "==> Adding performance indexes..."
if ! $MYSQL_CMD "$DB_NAME" < db_setup/11_add_performance_indexes.sql 2>&1; then
  echo "    (some indexes already exist — OK)"
fi

echo ""
echo "==> Verifying row counts..."
$MYSQL_CMD "$DB_NAME" < db_setup/99_verify.sql

echo ""
echo "Database setup complete! (database: ${DB_NAME})"
