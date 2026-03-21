# user_generator.py
# pip install faker

import csv
import random
import string
import unicodedata
import argparse
from pathlib import Path
import faker

# ---------- Faker ----------
fake_he = faker.Faker('he_IL')   # שמות בעברית
fake_en = faker.Faker('en_US')   # לשמות משתמש/גיבוי באנגלית

# ---------- קבועים ----------
DEFAULT_FILE = "users_data.csv"
DEFAULT_N = 1000
FIELDNAMES = ['שם פרטי', 'שם משפחה', 'שם משתמש', 'סיסמא']

# ניקוי סימני כיווניות נסתרים (RTL marks) + נירמול יוניקוד
_BIDI = dict.fromkeys(map(ord, "\u200e\u200f\u202a\u202b\u202c\u202d\u202e"), None)
def clean(s: str) -> str:
    if not isinstance(s, str):
        return s
    s = unicodedata.normalize("NFC", s)
    return s.translate(_BIDI)

# הפיכת שם לעיצור/ASCII בטוח (לשם משתמש). אם לא נשאר כלום → גיבוי לאנגלית
def ascii_slug(s: str) -> str:
    if not s:
        return ""
    # מנסה להמיר ל־ASCII; עברית תיעלם—זו המטרה כדי לא לייצר תווים בעייתיים בשם משתמש
    slug = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    slug = ''.join(ch for ch in slug if ch.isalnum() or ch in ['_', '-']).lower()
    return slug

# סיסמה חזקה: לפחות 12 תווים, עם קטגוריות חובה
def generate_strong_password(length: int = 12) -> str:
    if length < 12:
        length = 12
    pools = {
        "upper": string.ascii_uppercase,
        "lower": string.ascii_lowercase,
        "digits": string.digits,
        "punct": "!@#$%^&*",
    }
    # לפחות תו אחד מכל קטגוריה
    pwd = [
        random.choice(pools["upper"]),
        random.choice(pools["lower"]),
        random.choice(pools["digits"]),
        random.choice(pools["punct"]),
    ]
    # השלמה באקראי
    all_chars = ''.join(pools.values())
    pwd += [random.choice(all_chars) for _ in range(length - len(pwd))]
    random.shuffle(pwd)
    return ''.join(pwd)

# יצירת שם משתמש ייחודי (לטיני בלבד), עם טיפול בהתנגשויות
def make_username(first_he: str, last_he: str, used: set) -> str:
    base = f"{ascii_slug(first_he)}_{ascii_slug(last_he)}"
    if not base.strip('_'):
        # אם אין ASCII (למשל עברית בלבד) – שם משתמש גיבוי מאנגלית
        base = ascii_slug(f"{fake_en.first_name()}_{fake_en.last_name()}")
    base = base.strip('_')
    base = base[:18]  # חיתוך לגודל סביר, נשאיר מקום לסיומת
    candidate = base
    suffix = 1
    while candidate in used or not candidate:
        candidate = f"{base}{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate

def generate_users_data(n: int):
    used_usernames = set()
    rows = []
    for _ in range(n):
        first = clean(fake_he.first_name())
        last  = clean(fake_he.last_name())
        username = make_username(first, last, used_usernames)
        password = generate_strong_password(12)
        rows.append({
            'שם פרטי': first,
            'שם משפחה': last,
            'שם משתמש': username,
            'סיסמא': password
        })
    return rows

def create_csv_file(filename: str, fieldnames, data):
    # UTF-8 עם BOM כדי ש-Excel יזהה עברית; מפריד ';' נפוץ ב-Windows עברית
    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
            delimiter=";",
            quotechar='"',
            quoting=csv.QUOTE_MINIMAL,
            lineterminator="\n",
        )
        writer.writeheader()
        for row in data:
            writer.writerow({k: clean(str(v)) for k, v in row.items()})

def main():
    parser = argparse.ArgumentParser(description="Generate users CSV (Hebrew-friendly, Excel-safe).")
    parser.add_argument("-n", "--num-users", type=int, default=DEFAULT_N, help="number of users to generate")
    parser.add_argument("-o", "--output", default=DEFAULT_FILE, help="output CSV filename")
    parser.add_argument("--seed", type=int, default=None, help="random seed for reproducibility")
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)
        faker.Faker.seed(args.seed)

    data = generate_users_data(args.num_users)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    create_csv_file(args.output, FIELDNAMES, data)
    print(f"✅ נוצר קובץ {args.output} עם {len(data)} רשומות (UTF-8+BOM ;-delimited).")
    print("💡 אם Excel אצלך משתמש בפסיק כמפריד, פתח דרך Data → From Text/CSV ובחר Delimiter ';'.")

if __name__ == "__main__":
    main()
