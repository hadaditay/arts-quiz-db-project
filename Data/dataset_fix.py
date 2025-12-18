import csv
import sqlite3
from pathlib import Path


INPUT_CSV = "MetObjects.csv"              # הקובץ המקורי
OUTPUT_CSV = "MetObjects_update.csv"  # הקובץ המסונן שייכתב
COLUMN_NAME = "Is Public Domain"              # שם העמודה עם ה-TRUE
VALUE_TO_KEEP = "True"               # הערך שרוצים להשאיר



def main():
    input_path = Path(INPUT_CSV)
    if not input_path.exists():
        raise SystemExit(f"Input CSV not found: {input_path}")

    # read CSV
    with input_path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)

    if not rows:
        raise SystemExit("CSV is empty")

    header = rows[0]
    data_rows = rows[1:]

 
    if COLUMN_NAME not in header:
        raise SystemExit(f"Column '{COLUMN_NAME}' not found in CSV header: {header}")

    # מסד נתונים בזיכרון
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()

    # יוצרים טבלה 
    columns_sql = ", ".join(f'"{col}" TEXT' for col in header)
    cur.execute(f'CREATE TABLE data ({columns_sql});')

    # מכניסים את השורות
    placeholders = ", ".join("?" for _ in header)
    cur.executemany(
        f'INSERT INTO data VALUES ({placeholders});',
        data_rows,
    )
    conn.commit()

    # only those with public domain
    query = f'''
        SELECT *
        FROM data
        WHERE "{COLUMN_NAME}" = ?
    '''
    cur.execute(query, (VALUE_TO_KEEP,))
    filtered_rows = cur.fetchall()

    # new csv
    with Path(OUTPUT_CSV).open("w", newline="", encoding="utf-8") as f_out:
        writer = csv.writer(f_out)
        writer.writerow(header)
        writer.writerows(filtered_rows)

    conn.close()
    print(f"Done. Wrote {len(filtered_rows)} rows to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
