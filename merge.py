"""Merge per-source talk JSON files into one compact talks.json for the app.

Input files (from the browser collectors): talks-gc.json, talks-byu.json,
talks-byui.json, talks-byuh.json, talks-path.json
Output: talks.json  -> {"themes":[...], "sources":{...}, "talks":[[...], ...]}
"""
import json, re, sys, hashlib, html, os
from collections import Counter

SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else "talks.json"

SOURCES = {
    "gc": "General Conference",
    "byu": "BYU",
    "byui": "BYU–Idaho",
    "byuh": "BYU–Hawaii",
    "path": "BYU–Pathway",
}

# Theme -> regex over title + summary + official topics (case-insensitive)
THEMES = [
    ("Jesus Christ", r"\b(jesus|christ|savior|saviour|redeemer|messiah|lamb of god|good shepherd|son of god)\b"),
    ("Atonement & Grace", r"\b(atonement|atoning|grace|gethsemane|redemption|redeem|enabling power|mercy)\b"),
    ("Faith", r"\bfaith(ful|fulness|fulness)?\b|\bbelie(f|ve|ving)\b"),
    ("Repentance & Forgiveness", r"\b(repent\w*|forgiv\w*|sin|sins|confession|change of heart)\b"),
    ("Prayer", r"\bpray(er|ers|ing|ed)?\b"),
    ("Holy Ghost & Revelation", r"\b(holy ghost|spirit of the lord|holy spirit|revelation|inspiration|promptings?|still small voice|personal revelation|discernment)\b"),
    ("Scriptures", r"\b(scripture\w*|book of mormon|bible|doctrine and covenants|pearl of great price|word of god|study)\b"),
    ("Covenants & Temples", r"\b(covenant\w*|temple\w*|ordinance\w*|endowment|sealing|sacrament)\b"),
    ("Family & Marriage", r"\b(family|families|marriage|married|parent\w*|mother\w*|father\w*|children|home|husband|wife|eternal companion|dating)\b"),
    ("Love & Charity", r"\b(love|loving|charity|kindness|compassion|kind)\b"),
    ("Service & Ministering", r"\b(serv(e|ice|ing)|minister\w*|lift\w*|help(ing)? others|neighbor)\b"),
    ("Trials & Adversity", r"\b(trial\w*|adversity|affliction\w*|suffering|hardship|challenge\w*|tribulation\w*|storm\w*|grief|sorrow|pain|burden\w*|weakness)\b"),
    ("Hope & Peace", r"\b(hope|peace|comfort|rest|despair|anxiety|fear|joy|happiness|happy)\b"),
    ("Discipleship", r"\b(disciple\w*|follow (me|him)|come unto|take up|commitment|consecrat\w*)\b"),
    ("Obedience", r"\b(obedien\w*|obey\w*|commandment\w*|keep(ing)? the)\b"),
    ("Agency & Choices", r"\b(agency|choice\w*|choos\w*|decision\w*|accountab\w*|free to)\b"),
    ("Identity & Divine Nature", r"\b(identity|divine nature|child(ren)? of god|daughters? of god|sons? of god|worth|potential|who you are|heavenly parents)\b"),
    ("Plan of Salvation", r"\b(plan of salvation|plan of happiness|eternal life|exaltation|resurrection|premortal|mortality|death|eternity|eternal)\b"),
    ("Restoration & Prophets", r"\b(restoration|joseph smith|prophet\w*|apostle\w*|first vision|living prophet|church of jesus christ)\b"),
    ("Priesthood", r"\bpriesthood\b"),
    ("Missionary Work & Gathering", r"\b(missionar\w*|mission|gather\w*|share the gospel|sharing the gospel|convert\w*|conversion)\b"),
    ("Testimony & Conversion", r"\b(testimon\w*|witness|convert\w*|conversion|know(ing)? for (my|your)self)\b"),
    ("Humility & Gratitude", r"\b(humil\w*|humble|meek\w*|pride|gratitude|grateful|thank\w*)\b"),
    ("Education & Learning", r"\b(educat\w*|learn\w*|knowledge|teach\w*|intellect\w*|wisdom|scholar\w*)\b"),
    ("Work & Self-Reliance", r"\b(work|labor|self-relian\w*|self reliance|diligen\w*|career|provident|debt|employment|integrity|honest\w*)\b"),
    ("Leadership", r"\b(leader\w*|stewardship)\b"),
    ("Women & Relief Society", r"\b(women|woman|relief society|sisters?|young women)\b"),
    ("Youth & Young Adults", r"\b(youth|young adult\w*|young men|young women|students?|rising generation)\b"),
    ("Sabbath & Worship", r"\b(sabbath|worship|sacrament meeting|hymn\w*|music)\b"),
    ("Second Coming", r"\b(second coming|last days|latter days|millennium|prepar\w* for the)\b"),
    ("Courage & Resilience", r"\b(courage\w*|brave\w*|resilien\w*|endur\w*|persever\w*|steadfast\w*|strength)\b"),
    ("Science & Faith", r"\b(science|scientific|creation|evolution|reason)\b"),
    ("Christmas & Easter", r"\b(christmas|easter|nativity|bethlehem|empty tomb|risen)\b"),
]
THEME_RE = [(n, re.compile(p, re.I)) for n, p in THEMES]

HONORIFIC = re.compile(r"^(elder|president|sister|brother|bishop|dr\.?|professor|prof\.?|colonel|sheri)\s+", re.I)


def clean(s):
    if not s:
        return ""
    s = html.unescape(str(s))
    s = s.replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def norm_speaker(s):
    s = clean(s)
    s = re.sub(r"^by\s+", "", s, flags=re.I)
    # strip honorifics, possibly repeated ("President and Sister X" kept as-is)
    if " and " not in s.lower() and "&" not in s:
        prev = None
        while prev != s:
            prev = s
            s = HONORIFIC.sub("", s)
    return s


def tid(src, url):
    return src + hashlib.md5(url.encode()).hexdigest()[:8]


SKIP_TITLE = re.compile(r"^(untitled|faculty meeting|curriculum cycle report|career updates|.*state of the university.*)$", re.I)


def main():
    talks, seen = [], set()
    counts = Counter()
    for src in SOURCES:
        path = os.path.join(SRC_DIR, f"talks-{src}.json")
        if not os.path.exists(path):
            print("missing", path)
            continue
        data = json.load(open(path))
        apath = os.path.join(SRC_DIR, f"audio-{src}.json")  # optional {talk url: mp3 url}
        amap = json.load(open(apath)) if os.path.exists(apath) else {}
        for r in data:
            url = r.get("u")
            if not r.get("a") and amap.get(url):
                r["a"] = amap[url]
            t = clean(r.get("t")).strip("“”\"")
            if not url or not t or url in seen:
                continue
            if SKIP_TITLE.match(t):
                continue
            d = (r.get("d") or "")[:10]
            if d < "1990":
                continue
            seen.add(url)
            sp = norm_speaker(r.get("sp"))
            ds = clean(r.get("ds"))
            if len(ds) > 240:
                ds = ds[:237].rsplit(" ", 1)[0] + "…"
            official = [clean(x) for x in (r.get("tp") or [])]
            hay = " ".join([t, ds, " ".join(official)])
            th = [i for i, (n, rx) in enumerate(THEME_RE) if rx.search(hay)]
            kind = clean(r.get("k")) or "Talk"
            kind = {"Miscellaneou": "Miscellaneous", "Foundational Addresse": "Foundational Address", "Foundational Speeche": "Foundational Speech", "Mckay": "McKay"}.get(kind, kind).replace("Mckay", "McKay")
            talks.append([
                tid(src, url), src, t, sp, d, url, r.get("a") or "", kind, ds,
                th, official, clean(r.get("r")),
            ])
            counts[src] += 1
    talks.sort(key=lambda x: x[4], reverse=True)
    out = {
        "built": __import__("datetime").date.today().isoformat(),
        "fields": ["id", "src", "title", "speaker", "date", "url", "audio", "kind", "summary", "themes", "topics", "role"],
        "sources": SOURCES,
        "themes": [n for n, _ in THEMES],
        "talks": talks,
    }
    json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    print("wrote", OUT, len(talks), dict(counts), os.path.getsize(OUT), "bytes")
    untagged = sum(1 for x in talks if not x[9])
    print("untagged:", untagged)


if __name__ == "__main__":
    main()
