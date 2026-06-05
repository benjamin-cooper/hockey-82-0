#!/usr/bin/env python3
"""
Patch players.json with missing franchise-decade combos.
Specifically: CGY and NJD for 1990s–2020s (omitted due to decade_overrides bug).
Run: .venv/bin/python3 scripts/patch_missing.py
"""
import json, time, os, sys
import requests
from bs4 import BeautifulSoup
from collections import defaultdict

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "players.json")
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
BASE_URL = "https://www.hockey-reference.com"

MISSING = [
    ("CGY", "Flames",  "Calgary",     "CGY"),
    ("NJD", "Devils",  "New Jersey",  "NJD"),
]
DECADES = {
    "1990s": list(range(1991, 2001)),
    "2000s": list(range(2001, 2011)),
    "2010s": list(range(2011, 2021)),
    "2020s": list(range(2021, 2026)),
}

ERA_AVERAGES = {
    "1990s": {"goalsPerGame": 2.95, "savePct": 0.893, "pointsPerGame": 0.52},
    "2000s": {"goalsPerGame": 2.72, "savePct": 0.902, "pointsPerGame": 0.48},
    "2010s": {"goalsPerGame": 2.73, "savePct": 0.911, "pointsPerGame": 0.48},
    "2020s": {"goalsPerGame": 3.00, "savePct": 0.906, "pointsPerGame": 0.52},
}

def parse_int(v):
    try: return int(str(v).replace(",", "").strip())
    except: return 0

def parse_float(v):
    try: return float(str(v).replace(",", "").strip())
    except: return 0.0

def get_initials(name):
    parts = name.split()
    return (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else name[:2].upper()

def scrape_season(hr_abbr, year):
    url = f"{BASE_URL}/teams/{hr_abbr}/{year}.html"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code in (404, 429): return [], []
        resp.raise_for_status()
    except Exception as e:
        print(f"    Error: {e}"); return [], []

    soup = BeautifulSoup(resp.text, "html.parser")
    skaters, goalies = [], []

    # Shoots lookup
    shoots_lookup = {}
    rt = soup.find("table", {"id": "roster"})
    if rt:
        for row in rt.find("tbody").find_all("tr"):
            nc = row.find("td", {"data-stat": "player"})
            sc = row.find("td", {"data-stat": "shoots_and_catches"})
            if nc and sc:
                h = sc.text.strip()
                shoots_lookup[nc.text.strip()] = h[0] if h and h[0] in "LR" else "L"

    pt = soup.find("table", {"id": "player_stats"})
    if pt:
        for row in pt.find("tbody").find_all("tr"):
            nc = row.find("td", {"data-stat": "name_display"})
            if not nc or not nc.text.strip(): continue
            name = nc.text.strip()
            pos  = (row.find("td", {"data-stat": "pos"}) or type("",(),{"text":""})()).text.strip()
            gp   = parse_int((row.find("td", {"data-stat": "games"}) or type("",(),{"text":"0"})()).text)
            g    = parse_int((row.find("td", {"data-stat": "goals"}) or type("",(),{"text":"0"})()).text)
            a    = parse_int((row.find("td", {"data-stat": "assists"}) or type("",(),{"text":"0"})()).text)
            pts  = parse_int((row.find("td", {"data-stat": "points"}) or type("",(),{"text":"0"})()).text)
            pm   = parse_int((row.find("td", {"data-stat": "plus_minus"}) or type("",(),{"text":"0"})()).text)
            if gp < 10 or pos not in ("C","L","LW","R","RW","D","F","W"): continue
            if pos in ("F","W","L"): pos = "LW"
            elif pos == "R": pos = "RW"
            elif pos == "D": pos = "LD" if shoots_lookup.get(name,"L") == "L" else "RD"
            skaters.append({"name": name, "position": pos, "gp": gp, "goals": g, "assists": a, "points": pts, "plusMinus": pm})

    gt = soup.find("table", {"id": "goalie_stats"})
    if gt:
        for row in gt.find("tbody").find_all("tr"):
            nc = row.find("td", {"data-stat": "name_display"})
            if not nc or not nc.text.strip(): continue
            name = nc.text.strip()
            gp  = parse_int((row.find("td", {"data-stat": "goalie_games"}) or type("",(),{"text":"0"})()).text)
            w   = parse_int((row.find("td", {"data-stat": "goalie_wins"}) or type("",(),{"text":"0"})()).text)
            gaa = parse_float((row.find("td", {"data-stat": "goals_against_avg"}) or type("",(),{"text":"0"})()).text)
            sv  = parse_float((row.find("td", {"data-stat": "save_pct_goalie"}) or type("",(),{"text":"0"})()).text)
            so  = parse_int((row.find("td", {"data-stat": "goalie_shutouts"}) or type("",(),{"text":"0"})()).text)
            if gp < 10: continue
            goalies.append({"name": name, "position": "G", "gp": gp, "wins": w, "gaa": gaa, "savePct": sv, "shutouts": so})

    return skaters, goalies

def aggregate(data, is_goalie):
    by_name = {}
    for p in data:
        n = p["name"]
        if n not in by_name:
            by_name[n] = dict(p); by_name[n]["_count"] = 1
        else:
            e = by_name[n]; e["gp"] += p["gp"]; e["_count"] += 1
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
    era = ERA_AVERAGES.get(decade, ERA_AVERAGES["2010s"])
    if is_goalie:
        diff = p["savePct"] - era["savePct"]
        gain = (era["goalsPerGame"] - p["gaa"]) / era["goalsPerGame"]
        sor  = p["shutouts"] / p["gp"]
        return round(min(100, max(0, 50 + diff*250 + gain*30 + sor*30)), 1)
    else:
        ppg = p["pointsPerGame"]
        era_ppg = era["pointsPerGame"]
        ratio = ppg / era_ppg if era_ppg > 0 else 1.0
        return round(min(100, max(0, 20 + (ratio - 0.5) * 35)), 1)

# Load existing
existing = json.load(open(DATA_PATH, encoding="utf-8"))
existing_keys = {(p["franchiseAbbr"], p["decade"]) for p in existing}
max_id = max(p["id"] for p in existing)
new_players = []

for game_abbr, display_name, city, hr_abbr in MISSING:
    for decade, years in DECADES.items():
        if (game_abbr, decade) in existing_keys:
            print(f"  {game_abbr} {decade}: already exists, skipping"); continue

        print(f"\n{game_abbr} {decade}...", end=" ", flush=True)
        all_sk, all_go = [], []
        found = 0
        for year in years:
            sk, go = scrape_season(hr_abbr, year)
            if sk or go: found += 1; all_sk.extend(sk); all_go.extend(go)
            time.sleep(3.5)

        if not found:
            print("no data"); continue
        print(f"{found} seasons")

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

print(f"\nAdding {len(new_players)} new players")
all_players = existing + new_players
with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(all_players, f, indent=2, ensure_ascii=False)
print(f"Done. Total: {len(all_players)} players")
