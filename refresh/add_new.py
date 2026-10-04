"""Append newly collected talks to raw/talks-<src>.json (dedupe by URL).

Usage: python3 refresh/add_new.py new-gc.json [new-byu.json ...]
Each input is a JSON list of records from refresh/collectors.js (field "s" names the source).
Existing records with the same URL get any missing audio link filled in; nothing is removed.
Then run:  python3 merge.py raw talks.json
"""
import json, sys, os
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "raw")
incoming = defaultdict(list)
for f in sys.argv[1:]:
    for r in json.load(open(f)):
        if r.get("u") and r.get("t") and r.get("s"):
            incoming[r["s"]].append(r)
for src, recs in incoming.items():
    path = os.path.join(ROOT, f"talks-{src}.json")
    data = json.load(open(path)) if os.path.exists(path) else []
    by_url = {r.get("u"): r for r in data}
    added = filled = 0
    for r in recs:
        old = by_url.get(r["u"])
        if old is None:
            data.append(r); by_url[r["u"]] = r; added += 1
        elif r.get("a") and not old.get("a"):
            old["a"] = r["a"]; filled += 1
    json.dump(data, open(path, "w"), ensure_ascii=False)
    print(f"{src}: +{added} new, {filled} audio links filled, {len(data)} total")
