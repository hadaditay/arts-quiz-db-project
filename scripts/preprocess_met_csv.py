#!/usr/bin/env python3
"""
Convert MetObjects_update.csv into a clean TSV that MySQL LOAD DATA can parse
without choking on embedded commas, quotes, or newlines.

Usage:
    python3 scripts/preprocess_met_csv.py

Reads:  data/met/MetObjects_update.csv
Writes: data/met/MetObjects_clean.tsv
"""

import csv
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT = os.path.join(REPO_ROOT, "data", "met", "MetObjects_update.csv")
OUTPUT = os.path.join(REPO_ROOT, "data", "met", "MetObjects_clean.tsv")

# Columns in the source CSV (by header name) that we need, mapped to their index
NEEDED_HEADERS = [
    "Object Number",
    "Is Highlight",
    "Is Public Domain",
    "Object ID",
    "Department",
    "Object Name",
    "Title",
    "Culture",
    "Period",
    "Reign",
    "Portfolio",
    "Artist Role",
    "Artist Display Name",
    "Geography Type",
    "City",
    "County",
    "Region",
    "Link Resource",
    "Metadata Date",
    "Repository",
]


def clean(value: str) -> str:
    """Strip embedded tabs/newlines so TSV stays one-row-per-line."""
    return value.replace("\t", " ").replace("\n", " ").replace("\r", "")


def main():
    if not os.path.exists(INPUT):
        print(f"ERROR: {INPUT} not found", file=sys.stderr)
        sys.exit(1)

    written = 0
    skipped = 0

    with open(INPUT, "r", encoding="utf-8-sig") as fin, \
         open(OUTPUT, "w", encoding="utf-8", newline="") as fout:

        reader = csv.DictReader(fin)

        # Verify expected headers exist
        missing = [h for h in NEEDED_HEADERS if h not in reader.fieldnames]
        if missing:
            print(f"ERROR: Missing columns in CSV: {missing}", file=sys.stderr)
            sys.exit(1)

        # Write TSV header
        fout.write("\t".join(NEEDED_HEADERS) + "\n")

        for row in reader:
            object_id = row.get("Object ID", "").strip()
            if not object_id or not object_id.isdigit():
                skipped += 1
                continue

            fields = [clean(row.get(h, "")) for h in NEEDED_HEADERS]
            fout.write("\t".join(fields) + "\n")
            written += 1

    print(f"Done: {written} rows written, {skipped} skipped (no valid Object ID)")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    main()
