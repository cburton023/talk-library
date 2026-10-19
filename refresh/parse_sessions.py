"""Turn conference table-of-contents text files into raw/gc-sessions.json.

Each input file is named YYYY-MM.txt and has lines like "## Saturday Morning Session" followed by
one talk title per line (as listed on churchofjesuschrist.org/study/general-conference/YYYY/MM).
Usage: python3 refresh/parse_sessions.py DIR [raw/gc-sessions.json]   (merges into the existing file)
"""
import json, os, re, sys

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "raw", "gc-sessions.json")
data = json.load(open(out)) if os.path.exists(out) else {}
for f in sorted(os.listdir(src)):
    m = re.match(r"^(\d{4})-(\d{2})\.txt$", f)
    if not m:
        continue
    text = open(os.path.join(src, f)).read()
    if text.strip() == "FAILED":
        continue
    groups, cur = [], None
    for line in text.splitlines():
        line = line.strip().strip("*").strip()
        if not line:
            continue
        if line.startswith("#"):
            cur = [line.lstrip("#").strip().strip("*").strip(), []]
            groups.append(cur)
        elif cur is not None:
            cur[1].append(re.sub(r"^[-•\d.)\s]+(?=\S)", "", line) if re.match(r"^[-•]\s", line) else line)
    groups = [g for g in groups if g[1]]
    if groups:
        data[f"{m[1]}-{m[2]}"] = groups
json.dump(data, open(out, "w"), ensure_ascii=False, indent=0)
print(len(data), "conferences in", out)
