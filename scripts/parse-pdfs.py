#!/usr/bin/env python3
"""Extract the HSK 3.0 (2025) word tables from source/pdfs/*.pdf into data/raw/*.json.

Every row is then checked against source/hsk-3-0-all-levels.json (same source,
all levels in one list): simplified, traditional, pinyin and english must match
in the same order. That file also adds the official part of speech
(partOfSpeech, e.g. "动、（名）"), sense (1/2 for words listed twice) and
alsoLevels (other levels that list the word again).

Requires `pdftotext` (poppler-utils). Usage: python3 scripts/parse-pdfs.py
Exits non-zero if any row fails to parse, a level's count is wrong, or the
PDFs and the JSON disagree.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "source" / "pdfs"
OUT_DIR = ROOT / "data" / "raw"
OFFICIAL_JSON = ROOT / "source" / "hsk-3-0-all-levels.json"
COMPARED = ("simplified", "traditional", "pinyin", "english")

LEVELS = [
    # (pdf file, output key, numeric level used in ids, expected count)
    ("hsk-1.pdf", "hsk1", "1", 300),
    ("hsk-2.pdf", "hsk2", "2", 200),
    ("hsk-3.pdf", "hsk3", "3", 500),
    ("hsk-4.pdf", "hsk4", "4", 1000),
    ("hsk-5.pdf", "hsk5", "5", 1600),
    ("hsk-6.pdf", "hsk6", "6", 1800),
    ("hsk-7-9.pdf", "hsk7-9", "7-9", 5600),
]

# Lines that are page furniture, not table rows.
SKIP = re.compile(
    r"^(#\s+Simplified|HSK \d|HSK 3\.0|From Second Language|Words and pinyin)"
)
# Rows where the PDF itself is broken (e.g. a glyph its font could not render).
# Each fix is applied after parsing and listed in the report.
CORRECTIONS = {
    # PDF shows "□ g": the tone-marked ǹ is a missing glyph. ǹg is the
    # "agreeing" reading that matches the English gloss. Verify against the
    # printed 新版HSK考试大纲 when possible.
    ("hsk4", 534): {"simplified": "嗯", "pinyin": "ǹg", "needsReview": True},
}

# Every pinyin syllable, written without tone marks (ü as v).
_INITIALS = "b p m f d t n l g k h z c s zh ch sh r j q x y w".split()
_FINALS = ("a o e i u v ai ei ao ou an en ang eng ong er ia ie iao iu ian in "
           "iang ing iong ua uo uai ui uan un uang ue ve van vn").split()
SYLLABLES = set(_FINALS) | {i + f for i in _INITIALS for f in _FINALS} | {
    "m", "n", "ng", "hm", "hng", "r"}


def pinyin_ok(pinyin):
    """True if every word in `pinyin` splits into real pinyin syllables."""
    bare = unicodedata.normalize("NFD", pinyin.lower()).replace("u\u0308", "v")
    bare = "".join(c for c in bare if not unicodedata.combining(c))

    def splits(w):
        return not w or any(w[:k] in SYLLABLES and splits(w[k:])
                            for k in range(min(6, len(w)), 0, -1))

    return all(splits(w) for w in re.split(r"[ \-'’·,/…()]+", bare))


ROW = re.compile(r"^(\d+)\s{2,}(.+)$")
CJK = re.compile(r"^[㐀-鿿豈-﫿〇…（）()·，、／/A-Za-z0-9]+$")
# Pinyin: latin letters with tone marks, spaces, hyphens, apostrophes, ü, //, commas.
PINYIN = re.compile(r"^[a-zA-ZüÜÀ-ɏ̀-ͯ' \-’·,/…()]+$")


def pdf_lines(path):
    text = subprocess.run(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
        check=True, capture_output=True, text=True,
    ).stdout
    for line in text.splitlines():
        yield unicodedata.normalize("NFC", line.replace("\f", "")).rstrip()


def parse_level(pdf, key, level, expected):
    rows, errors, seen = [], [], set()
    for lineno, line in enumerate(pdf_lines(PDF_DIR / pdf), 1):
        s = line.strip()
        if not s or SKIP.match(s):
            continue
        m = ROW.match(s)
        if not m:
            errors.append((lineno, "not a table row", s))
            continue
        num = int(m.group(1))
        parts = re.split(r"\s{2,}", m.group(2))
        if len(parts) != 4:
            errors.append((lineno, f"expected 4 columns after #, got {len(parts)}", s))
            continue
        simp, trad, pinyin, english = (p.strip() for p in parts)
        problems = []
        if not CJK.match(simp):
            problems.append(f"simplified {simp!r}")
        if not CJK.match(trad):
            problems.append(f"traditional {trad!r}")
        if not PINYIN.match(pinyin):
            problems.append(f"pinyin {pinyin!r}")
        if not english:
            problems.append("empty english")
        if num in seen:
            problems.append(f"duplicate number {num}")
        if problems:
            errors.append((lineno, "; ".join(problems), s))
            continue
        seen.add(num)
        rows.append({
            "id": f"hsk{level}-{num:04d}",
            "level": level if level == "7-9" else int(level),
            "number": num,
            "simplified": simp,
            "traditional": trad,
            "pinyin": pinyin,
            "english": english,
        })

    fixed = []
    for r in rows:
        fix = CORRECTIONS.get((key, r["number"]))
        if fix:
            if r["simplified"] != fix["simplified"]:
                errors.append((0, f"correction for #{r['number']} expects {fix['simplified']}", r["simplified"]))
                continue
            fixed.append(f"#{r['number']} {r['simplified']}: pinyin {r['pinyin']!r} -> {fix['pinyin']!r}")
            r["pinyin"] = fix["pinyin"]
            if fix.get("needsReview"):
                r["needsReview"] = True
        if not pinyin_ok(r["pinyin"]):
            errors.append((0, f"#{r['number']} {r['simplified']}: not valid pinyin", r["pinyin"]))

    rows.sort(key=lambda r: r["number"])
    missing = sorted(set(range(1, expected + 1)) - seen)
    extra = sorted(n for n in seen if n > expected)
    return rows, errors, missing, extra, fixed


def add_official(all_rows):
    """Check rows against the all-levels JSON and copy its extra fields. Returns error strings."""
    terms = json.loads(OFFICIAL_JSON.read_text(encoding="utf-8"))["terms"]
    if len(terms) != len(all_rows):
        return [f"{OFFICIAL_JSON.name} has {len(terms)} terms but the PDFs have {len(all_rows)} rows"]
    errors = []
    for i, (row, term) in enumerate(zip(all_rows, terms)):
        if term["number"] != i + 1:
            errors.append(f"{OFFICIAL_JSON.name} term {i + 1} is numbered {term['number']}")
        for field in COMPARED:
            if row[field] != term[field]:
                errors.append(f"{row['id']}: {field} is {row[field]!r} in the PDF but {term[field]!r} in {OFFICIAL_JSON.name}")
        row["partOfSpeech"] = term["partOfSpeech"]
        if "sense" in term:
            row["sense"] = term["sense"]
        if term.get("alsoLevels"):
            row["alsoLevels"] = term["alsoLevels"]
    return errors


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ok = True
    total = 0
    parsed = []
    print(f"{'Level':<8}{'Expected':>10}{'Parsed':>10}  Status")
    for pdf, key, level, expected in LEVELS:
        rows, errors, missing, extra, fixed = parse_level(pdf, key, level, expected)
        good = not errors and not missing and not extra and len(rows) == expected
        ok &= good
        total += len(rows)
        print(f"{key:<8}{expected:>10}{len(rows):>10}  {'OK' if good else 'FAIL'}")
        for f in fixed:
            print(f"    corrected {f}")
        for lineno, why, text in errors:
            print(f"    line {lineno}: {why}\n      {text}")
        if missing:
            print(f"    missing row numbers: {missing[:30]}{' …' if len(missing) > 30 else ''}")
        if extra:
            print(f"    unexpected row numbers: {extra[:30]}")
        parsed.append((key, rows))
    print(f"Total parsed: {total}")
    if not ok:
        print("\nParsing FAILED — fix the errors above before continuing.")
        sys.exit(1)

    mismatches = add_official([row for _, rows in parsed for row in rows])
    if mismatches:
        print(f"\n{len(mismatches)} difference(s) between the PDFs and {OFFICIAL_JSON.name}:")
        for m in mismatches[:50]:
            print(f"  {m}")
        sys.exit(1)

    for key, rows in parsed:
        out = OUT_DIR / f"{key}.json"
        out.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"\nAll levels parsed, counts match, and every row matches {OFFICIAL_JSON.name}.")


if __name__ == "__main__":
    main()
