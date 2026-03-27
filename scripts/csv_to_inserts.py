#!/usr/bin/env python3
"""
Convert all project CSVs into bulk INSERT .sql files.
This avoids LOAD DATA LOCAL INFILE, which requires server-side config.

Usage:  python3 scripts/csv_to_inserts.py
Output: db_setup/generated/*.sql  (one per table)
"""

import csv
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, "db_setup", "generated")
BATCH = 500  # rows per INSERT statement


def esc(val: str | None) -> str:
    """Escape a value for MySQL."""
    if val is None or val.strip() == "":
        return "NULL"
    v = val.replace("\\", "\\\\").replace("'", "\\'").replace("\r", "").replace("\n", " ")
    return f"'{v}'"


def write_inserts(out_path: str, table: str, columns: list[str], rows: list[list[str]], ignore: bool = False):
    """Write batched INSERT statements to a .sql file."""
    cols = ", ".join(f"`{c}`" for c in columns)
    kw = "INSERT IGNORE" if ignore else "INSERT"
    with open(out_path, "w", encoding="utf-8") as f:
        for i in range(0, len(rows), BATCH):
            batch = rows[i : i + BATCH]
            f.write(f"{kw} INTO `{table}` ({cols}) VALUES\n")
            vals = []
            for row in batch:
                vals.append("(" + ", ".join(row) + ")")
            f.write(",\n".join(vals) + ";\n\n")
    print(f"  {table}: {len(rows)} rows -> {out_path}")


# ---------------------------------------------------------------------------
# 1. users  (semicolon-separated, Hebrew headers)
# ---------------------------------------------------------------------------
def gen_users():
    path = os.path.join(REPO, "data", "users", "users_data.csv")
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        next(reader)  # skip header
        for r in reader:
            if len(r) < 4:
                continue
            first_name, last_name, username, password = r[0], r[1], r[2], r[3]
            rows.append([esc(first_name), esc(last_name), esc(username), esc(password)])
    write_inserts(
        os.path.join(OUT_DIR, "02_users.sql"),
        "game_user",
        ["first_name", "last_name", "username", "password"],
        rows,
        ignore=True,
    )


# ---------------------------------------------------------------------------
# 2. artists  (comma-separated)
# ---------------------------------------------------------------------------
def gen_artists():
    path = os.path.join(REPO, "data", "met", "met_artists.csv")
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            full_name = r.get("full_name", "").strip()
            if not full_name:
                continue
            bio = r.get("bio", "").strip()
            by = r.get("birth_year", "").strip()
            dy = r.get("death_year", "").strip()
            birth_year = by if by and by.lstrip("-").isdigit() else None
            death_year = dy if dy and dy.lstrip("-").isdigit() else None
            rows.append([
                esc(full_name),
                esc(bio if bio else None),
                birth_year if birth_year else "NULL",
                death_year if death_year else "NULL",
            ])
    write_inserts(
        os.path.join(OUT_DIR, "03_artists.sql"),
        "artist_profile",
        ["full_name", "bio", "birth_year", "death_year"],
        rows,
        ignore=True,
    )


# ---------------------------------------------------------------------------
# 3. artworks  (uses the preprocessed TSV from preprocess_met_csv.py)
# ---------------------------------------------------------------------------
def gen_artworks():
    tsv_path = os.path.join(REPO, "data", "met", "MetObjects_clean.tsv")
    if not os.path.exists(tsv_path):
        print("  [artworks] MetObjects_clean.tsv not found, running preprocessor...")
        os.system(f"{sys.executable} {os.path.join(REPO, 'scripts', 'preprocess_met_csv.py')}")

    rows = []
    with open(tsv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for r in reader:
            oid = r.get("Object ID", "").strip()
            if not oid or not oid.isdigit():
                continue
            is_pd = "1" if r.get("Is Public Domain", "").strip().lower() == "true" else "0"
            is_hl = "1" if r.get("Is Highlight", "").strip().lower() == "true" else "0"
            rows.append([
                oid,
                esc(r.get("Title", "").strip() or None),
                esc(r.get("Department", "").strip() or None),
                esc(r.get("Culture", "").strip() or None),
                esc(r.get("Artist Display Name", "").strip() or None),
                is_pd,
                is_hl,
                "NULL",  # primary_image
                "NULL",  # primary_image_small
                "0",     # image_checked
                esc(r.get("Link Resource", "").strip() or None),
                "NULL",  # tags
            ])
    write_inserts(
        os.path.join(OUT_DIR, "04_artworks.sql"),
        "met_artwork",
        ["artwork_id", "title", "department", "culture", "artist_display_name",
         "is_public_domain", "is_highlight", "primary_image", "primary_image_small",
         "image_checked", "object_url", "tags"],
        rows,
        ignore=True,
    )


# ---------------------------------------------------------------------------
# 4. art periods
# ---------------------------------------------------------------------------
def gen_art_periods():
    path = os.path.join(REPO, "data", "historical", "art_periods.csv")
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append([
                esc(r["period_name"].strip()),
                esc(r["region"].strip()),
                r["start_year"].strip(),
                r["end_year"].strip(),
            ])
    write_inserts(
        os.path.join(OUT_DIR, "05_art_periods.sql"),
        "art_period",
        ["period_name", "region", "start_year", "end_year"],
        rows,
    )


# ---------------------------------------------------------------------------
# 5. countries
# ---------------------------------------------------------------------------
def gen_countries():
    path = os.path.join(REPO, "data", "historical", "countries.csv")
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append([
                esc(r["country_name"].strip()),
                esc(r["iso_code"].strip()),
                esc(r["continent"].strip()),
            ])
    write_inserts(
        os.path.join(OUT_DIR, "07_countries.sql"),
        "country",
        ["country_name", "iso_code", "continent"],
        rows,
    )


# ---------------------------------------------------------------------------
# 6. wines  (large ~130K file, may not exist)
# ---------------------------------------------------------------------------
def gen_wines():
    path = os.path.join(REPO, "data", "wines", "winemag-data-130k-v2.csv")
    if not os.path.exists(path):
        print("  [wines] winemag-data-130k-v2.csv not found — skipping")
        return
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            points = r.get("points", "").strip()
            price = r.get("price", "").strip()
            rows.append([
                esc(r.get("title", "").strip() or None),
                esc(r.get("variety", "").strip() or None),
                esc(r.get("winery", "").strip() or None),
                esc(r.get("country", "").strip() or None),
                esc(r.get("province", "").strip() or None),
                esc(r.get("region_1", "").strip() or None),
                points if points and points.isdigit() else "NULL",
                price if price and price.replace(".", "", 1).isdigit() else "NULL",
                esc(r.get("description", "").strip() or None),
            ])
    write_inserts(
        os.path.join(OUT_DIR, "09_wines.sql"),
        "wine",
        ["title", "variety", "winery", "country", "province", "region_1",
         "points", "price", "description"],
        rows,
    )


# ---------------------------------------------------------------------------
# 7. wine food pairings
# ---------------------------------------------------------------------------
def gen_wine_food_pairings():
    path = os.path.join(REPO, "data", "wines", "wine_food_pairings.csv")
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append([
                esc(r["variety"].strip()),
                esc(r["food_name"].strip()),
                esc(r["cuisine_region"].strip()),
            ])
    write_inserts(
        os.path.join(OUT_DIR, "10_wine_food_pairings.sql"),
        "wine_food_pairing",
        ["variety", "food_name", "cuisine_region"],
        rows,
    )


# ---------------------------------------------------------------------------
# 8. wars & battles
# ---------------------------------------------------------------------------
def gen_wars():
    path = os.path.join(REPO, "data", "historical", "wars_battles.csv")
    rows = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append([
                esc(r["war_name"].strip()),
                esc(r["war_type"].strip()),
                r["start_year"].strip(),
                r["end_year"].strip(),
                esc(r.get("region", "").strip() or None),
                esc(r.get("country_name", "").strip() or None),
                esc(r.get("description", "").strip() or None),
                esc(r.get("notable_figures", "").strip() or None),
            ])
    write_inserts(
        os.path.join(OUT_DIR, "12_wars.sql"),
        "war_battle",
        ["war_name", "war_type", "start_year", "end_year", "region",
         "country_name", "description", "notable_figures"],
        rows,
        ignore=True,
    )


# ===========================================================================
def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Generating INSERT SQL files...")
    gen_users()
    gen_artists()
    gen_artworks()
    gen_art_periods()
    gen_countries()
    gen_wines()
    gen_wine_food_pairings()
    gen_wars()
    print("Done! Files written to db_setup/generated/")


if __name__ == "__main__":
    main()
