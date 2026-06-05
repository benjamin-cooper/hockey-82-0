#!/usr/bin/env python3
"""
Patch players.json with new franchise-decade combos:
VGK, SEA, UTA, WPG (new), NSH, FLA, CBJ, OTT, ANA, CAR, MIN, PHX

Run: .venv/bin/python3 scripts/patch_new_franchises.py
"""
import json, time, os
import requests
from bs4 import BeautifulSoup
from collections import defaultdict

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "players.json")
BASE_URL  = "https://www.hockey-reference.com"
HEADERS   = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# (game_abbr, display_name, city, {decade: hr_abbr | list[hr_abbr]})
# list means "try all of these abbreviations for years in that decade"
NEW_FRANCHISES = [
    ("VGK", "Golden Knights", "Vegas",     {"2010s": "VGK", "2020s": "VGK"}),
    ("SEA", "Kraken",         "Seattle",   {"2020s": "SEA"}),
    # UTA = Utah HC (2024-25 season only so far); ARI covers 2015-2024, PHX covers 1996-2014
    ("UTA", "Hockey Club",    "Utah",      {"2020s": ["UTA", "ARI"]}),
    ("PHX", "Coyotes",        "Phoenix",   {"1990s": "PHX", "2000s": "PHX", "2010s": ["PHX", "ARI"]}),
    ("WPG", "Jets",           "Winnipeg",  {"2010s": "WPG", "2020s": "WPG"}),
    ("NSH", "Predators",      "Nashville", {"1990s": "NSH", "2000s": "NSH", "2010s": "NSH", "2020s": "NSH"}),
    ("FLA", "Panthers",       "Florida",   {"1990s": "FLA", "2000s": "FLA", "2010s": "FLA", "2020s": "FLA"}),
    ("CBJ", "Blue Jackets",   "Columbus",  {"2000s": "CBJ", "2010s": "CBJ", "2020s": "CBJ"}),
    ("OTT", "Senators",       "Ottawa",    {"1990s": "OTT", "2000s": "OTT", "2010s": "OTT", "2020s": "OTT"}),
    ("ANA", "Ducks",          "Anaheim",   {"1990s": "ANA", "2000s": "ANA", "2010s": "ANA", "2020s": "ANA"}),
    ("CAR", "Hurricanes",     "Carolina",  {"1990s": "CAR", "2000s": "CAR", "2010s": "CAR", "2020s": "CAR"}),
    ("MIN", "Wild",           "Minnesota", {"2000s": "MIN", "2010s": "MIN", "2020s": "MIN"}),
]

DECADES = {
    "1990s": list(range(1991, 2001)),
    "2000s": list(range(2001, 2011)),
    "2010s": list(range(2011, 2021)),
    "2020s": list(range(2021, 2026)),
}

ERA_AVG = {
    "1990s": {"goalsPerGame": 2.95, "savePct": 0.893, "pointsPerGame": 0.52},
    "2000s": {"goalsPerGame": 2.72, "savePct": 0.902, "pointsPerGame": 0.48},
    "2010s": {"goalsPerGame": 2.73, "savePct": 0.911, "pointsPerGame": 0.48},
    "2020s": {"goalsPerGame": 3.00, "savePct": 0.906, "pointsPerGame": 0.52},
}

def parse_int(v):
    try: return int(str(v).replace(",","").strip())
    except: return 0

def parse_float(v):
    try: return float(str(v).replace(",","").strip())
    except: return 0.0

def get_initials(name):
    parts = name.split()
    return (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else name[:2].upper()

def scrape_season(hr_abbr, year):
    url = f"{BASE_URL}/teams/{hr_abbr}/{year}.html"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code in (404, 429, 503): return [], []
        r.raise_for_status()
    except: return [], []

    soup = BeautifulSoup(r.text, "html.parser")
    skaters, goalies = [], []

    # Shoots lookup
    sl = {}
    rt = soup.find("table", {"id": "roster"})
    if rt:
        for row in rt.find("tbody").find_all("tr"):
            nc = row.find("td", {"data-stat": "player"})
            sc = row.find("td", {"data-stat": "shoots_and_catches"})
            if nc and sc:
                h = sc.text.strip()
                sl[nc.text.strip()] = h[0] if h and h[0] in "LR" else "L"

    pt = soup.find("table", {"id": "player_stats"})
    if pt:
        for row in pt.find("tbody").find_all("tr"):
            nc = row.find("td", {"data-stat": "name_display"})
            if not nc or not nc.text.strip(): continue
            name = nc.text.strip()
            pos  = (row.find("td", {"data-stat": "pos"}) or type("",(),{"text":""})()).text.strip()
            gp   = parse_int((row.find("td", {"data-stat": "games"})       or type("",(),{"text":"0"})()).text)
            g    = parse_int((row.find("td", {"data-stat": "goals"})       or type("",(),{"text":"0"})()).text)
            a    = parse_int((row.find("td", {"data-stat": "assists"})     or type("",(),{"text":"0"})()).text)
            pts  = parse_int((row.find("td", {"data-stat": "points"})      or type("",(),{"text":"0"})()).text)
            pm   = parse_int((row.find("td", {"data-stat": "plus_minus"})  or type("",(),{"text":"0"})()).text)
            if gp < 10 or pos not in ("C","L","LW","R","RW","D","F","W"): continue
            if pos in ("F","W","L"): pos = "LW"
            elif pos == "R": pos = "RW"
            elif pos == "D": pos = "LD" if sl.get(name,"L") == "L" else "RD"
            skaters.append({"name": name, "position": pos, "gp": gp, "goals": g, "assists": a, "points": pts, "plusMinus": pm})

    gt = soup.find("table", {"id": "goalie_stats"})
    if gt:
        for row in gt.find("tbody").find_all("tr"):
            nc = row.find("td", {"data-stat": "name_display"})
            if not nc or not nc.text.strip(): continue
            name = nc.text.strip()
            gp  = parse_int((row.find("td", {"data-stat": "goalie_games"})      or type("",(),{"text":"0"})()).text)
            w   = parse_int((row.find("td", {"data-stat": "goalie_wins"})       or type("",(),{"text":"0"})()).text)
            gaa = parse_float((row.find("td", {"data-stat": "goals_against_avg"})  or type("",(),{"text":"0"})()).text)
            sv  = parse_float((row.find("td", {"data-stat": "save_pct_goalie"})    or type("",(),{"text":"0"})()).text)
            so  = parse_int((row.find("td", {"data-stat": "goalie_shutouts"})   or type("",(),{"text":"0"})()).text)
            if gp < 10: continue
            goalies.append({"name": name, "position": "G", "gp": gp, "wins": w, "gaa": gaa, "savePct": sv, "shutouts": so})

    return skaters, goalies

def aggregate(data, is_goalie):
    by_name = {}
    for p in data:
        n = p["name"]
        if n not in by_name:
            by_name[n] = dict(p)
        else:
            e = by_name[n]; e["gp"] += p["gp"]
            if is_goalie:
                e["wins"] += p["wins"]; e["shutouts"] += p["shutouts"]
                tg = e["gp"]; w1 = (tg - p["gp"]) / tg; w2 = p["gp"] / tg
                e["gaa"] = e["gaa"]*w1 + p["gaa"]*w2
                e["savePct"] = e["savePct"]*w1 + p["savePct"]*w2
            else:
                e["goals"] += p["goals"]; e["assists"] += p["assists"]
                e["points"] += p["points"]; e["plusMinus"] += p["plusMinus"]
    result = []
    for p in by_name.values():
        min_gp = 50 if is_goalie else 100
        if p["gp"] < min_gp: continue
        if not is_goalie: p["pointsPerGame"] = round(p["points"] / p["gp"], 3)
        result.append(p)
    result.sort(key=lambda x: x["gp"], reverse=True)
    return result

def calc_strength(p, decade, is_goalie):
    era = ERA_AVG.get(decade, ERA_AVG["2010s"])
    if is_goalie:
        diff = p["savePct"] - era["savePct"]
        gain = (era["goalsPerGame"] - p["gaa"]) / era["goalsPerGame"]
        sor  = p["shutouts"] / p["gp"]
        return round(min(100, max(0, 50 + diff*250 + gain*30 + sor*30)), 1)
    ppg = p["pointsPerGame"]
    ratio = ppg / era["pointsPerGame"] if era["pointsPerGame"] > 0 else 1.0
    return round(min(100, max(0, 20 + (ratio - 0.5) * 35)), 1)

# ── Main ─────────────────────────────────────────────────────────────────────

existing = json.load(open(DATA_PATH, encoding="utf-8"))
existing_keys = {(p["franchiseAbbr"], p["decade"]) for p in existing}
max_id = max(p["id"] for p in existing)
new_players = []

for game_abbr, display_name, city, decade_map in NEW_FRANCHISES:
    print(f"\n{'='*50}")
    print(f"  {city} {display_name} ({game_abbr})")
    print(f"{'='*50}")

    for decade, hr_abbrs in decade_map.items():
        if (game_abbr, decade) in existing_keys:
            print(f"  {decade}: already exists, skipping"); continue

        if isinstance(hr_abbrs, str):
            hr_abbrs = [hr_abbrs]

        years = DECADES[decade]
        all_sk, all_go = [], []
        found = 0

        for hr_abbr in hr_abbrs:
            for year in years:
                sk, go = scrape_season(hr_abbr, year)
                if sk or go:
                    found += 1
                    all_sk.extend(sk); all_go.extend(go)
                time.sleep(3.5)

        if not found:
            print(f"  {decade}: no data"); continue
        print(f"  {decade}: {found} season-pages scraped")

        by_pos = defaultdict(list)
        for p in aggregate(all_sk, False):
            by_pos[p["position"]].append(p)

        for pos, players in by_pos.items():
            for p in players[:10]:
                max_id += 1
                new_players.append({
                    "id": max_id, "name": p["name"], "initials": get_initials(p["name"]),
                    "position": pos, "franchise": display_name, "franchiseAbbr": game_abbr,
                    "city": city, "decade": decade,
                    "stats": {"gp": p["gp"], "goals": p["goals"], "assists": p["assists"],
                              "points": p["points"], "plusMinus": p["plusMinus"],
                              "pointsPerGame": p["pointsPerGame"]},
                    "strengthScore": calc_strength(p, decade, False),
                })
                player_id = max_id

        for p in aggregate(all_go, True)[:8]:
            max_id += 1
            new_players.append({
                "id": max_id, "name": p["name"], "initials": get_initials(p["name"]),
                "position": "G", "franchise": display_name, "franchiseAbbr": game_abbr,
                "city": city, "decade": decade,
                "stats": {"gp": p["gp"], "wins": p["wins"], "gaa": round(p["gaa"],2),
                          "savePct": round(p["savePct"],3), "shutouts": p["shutouts"]},
                "strengthScore": calc_strength(p, decade, True),
            })

print(f"\n\nNew players to add: {len(new_players)}")
all_players = existing + new_players
with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(all_players, f, indent=2, ensure_ascii=False)
print(f"Total players: {len(all_players)}")
