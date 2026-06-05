#!/usr/bin/env python3
"""
Hockey Reference scraper for hockey-82-0.
Scrapes skater and goalie stats by franchise × decade.
Outputs: data/players.json

Usage:
  pip install requests beautifulsoup4
  python scripts/scrape.py
"""

import json
import time
import os
import re
from collections import defaultdict
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.hockey-reference.com"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "players.json")

# Franchise definitions: abbr → (display_name, city, hr_abbr_overrides_by_decade)
# hr_abbr is the Hockey Reference team abbreviation for that era
FRANCHISES = [
    # (game_abbr, display_name, city, {decade: hr_abbr} or None for same)
    ("MTL", "Canadiens",   "Montreal",      None),
    ("TOR", "Maple Leafs", "Toronto",       None),
    ("BOS", "Bruins",      "Boston",        None),
    ("DET", "Red Wings",   "Detroit",       None),
    ("CHI", "Blackhawks",  "Chicago",       None),
    ("NYR", "Rangers",     "New York",      None),
    ("EDM", "Oilers",      "Edmonton",      None),
    ("PIT", "Penguins",    "Pittsburgh",    None),
    ("PHI", "Flyers",      "Philadelphia",  None),
    ("NYI", "Islanders",   "New York",      None),
    ("BUF", "Sabres",      "Buffalo",       None),
    ("STL", "Blues",       "St. Louis",     None),
    ("VAN", "Canucks",     "Vancouver",     None),
    ("CGY", "Flames",      "Calgary",       {"1980s": "CGY", "1970s": "ATL"}),
    ("NJD", "Devils",      "New Jersey",    {"1980s": "NJD", "1970s": "CLR"}),
    ("COL", "Avalanche",   "Colorado",      {"1990s": "COL", "1980s": "QUE", "2000s": "COL", "2010s": "COL", "2020s": "COL"}),
    ("DAL", "Stars",       "Dallas",        {"1990s": "DAL", "1980s": "MNS", "1970s": "MNS", "2000s": "DAL", "2010s": "DAL", "2020s": "DAL"}),
    ("LAK", "Kings",       "Los Angeles",   None),
    ("WSH", "Capitals",    "Washington",    None),
    ("TBL", "Lightning",   "Tampa Bay",     None),
    # Historic / defunct
    ("QUE", "Nordiques",   "Quebec",        {"1980s": "QUE", "1990s": "QUE"}),
    ("HFD", "Whalers",     "Hartford",      {"1980s": "HFD", "1990s": "HFD"}),
    ("MNS", "North Stars", "Minnesota",     {"1970s": "MNS", "1980s": "MNS", "1990s": "MNS"}),
    ("WIN", "Jets",        "Winnipeg",      {"1980s": "WIN", "1990s": "WIN"}),
]

# Decade → list of season end years
DECADES = {
    "1950s": list(range(1951, 1961)),
    "1960s": list(range(1961, 1971)),
    "1970s": list(range(1971, 1981)),
    "1980s": list(range(1981, 1991)),
    "1990s": list(range(1991, 2001)),
    "2000s": list(range(2001, 2011)),
    "2010s": list(range(2011, 2021)),
    "2020s": list(range(2021, 2026)),
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

session = requests.Session()
session.headers.update(HEADERS)

def get_page(url: str, retries=3) -> BeautifulSoup | None:
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=15)
            if resp.status_code == 404:
                return None
            if resp.status_code == 429:
                print(f"  Rate limited, sleeping 60s...")
                time.sleep(60)
                continue
            resp.raise_for_status()
            resp.encoding = 'utf-8'
            return BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            print(f"  Error fetching {url}: {e} (attempt {attempt+1})")
            time.sleep(5)
    return None


def parse_float(val: str) -> float:
    try:
        return float(val.replace(",", "").strip())
    except (ValueError, AttributeError):
        return 0.0


def parse_int(val: str) -> int:
    try:
        return int(val.replace(",", "").strip())
    except (ValueError, AttributeError):
        return 0


def get_initials(name: str) -> str:
    parts = name.split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper()


def scrape_season(hr_abbr: str, year: int) -> tuple[list[dict], list[dict]]:
    """Returns (skaters, goalies) for a single season."""
    url = f"{BASE_URL}/teams/{hr_abbr}/{year}.html"
    soup = get_page(url)
    if soup is None:
        return [], []

    # Build shooting-hand lookup from roster table (name → "L" or "R")
    shoots_lookup: dict[str, str] = {}
    roster_table = soup.find("table", {"id": "roster"})
    if roster_table:
        for row in roster_table.find("tbody").find_all("tr"):
            name_cell = row.find("td", {"data-stat": "player"})
            sc_cell = row.find("td", {"data-stat": "shoots_and_catches"})
            if name_cell and sc_cell:
                sc = sc_cell.text.strip()  # e.g. "L/-" or "R/-"
                hand = sc[0] if sc and sc[0] in ("L", "R") else "L"
                shoots_lookup[name_cell.text.strip()] = hand

    skaters = []
    goalies = []

    # --- Skaters ---
    skater_table = soup.find("table", {"id": "player_stats"})
    if skater_table:
        for row in skater_table.find("tbody").find_all("tr"):
            if row.get("class") and "thead" in row.get("class", []):
                continue

            player_cell = row.find("td", {"data-stat": "name_display"})
            if not player_cell or not player_cell.text.strip():
                continue

            name = player_cell.text.strip()
            if name in ("", "Team Total", "Total"):
                continue

            pos_cell = row.find("td", {"data-stat": "pos"})
            gp_cell  = row.find("td", {"data-stat": "games"})
            g_cell   = row.find("td", {"data-stat": "goals"})
            a_cell   = row.find("td", {"data-stat": "assists"})
            pts_cell = row.find("td", {"data-stat": "points"})
            pm_cell  = row.find("td", {"data-stat": "plus_minus"})

            pos = pos_cell.text.strip() if pos_cell else ""
            gp  = parse_int(gp_cell.text)  if gp_cell  else 0
            g   = parse_int(g_cell.text)   if g_cell   else 0
            a   = parse_int(a_cell.text)   if a_cell   else 0
            pts = parse_int(pts_cell.text) if pts_cell else 0
            pm  = parse_int(pm_cell.text)  if pm_cell  else 0

            if gp < 10 or pos not in ("C", "L", "LW", "R", "RW", "D", "F", "W"):
                continue

            if pos in ("F", "W", "L"):
                pos = "LW"
            elif pos == "R":
                pos = "RW"
            elif pos == "D":
                shoots = shoots_lookup.get(name, "L")
                pos = "LD" if shoots == "L" else "RD"
            # "LW" and "RW" already correct

            skaters.append({
                "name": name,
                "position": pos,
                "gp": gp,
                "goals": g,
                "assists": a,
                "points": pts,
                "plusMinus": pm,
            })

    # --- Goalies ---
    goalie_table = soup.find("table", {"id": "goalie_stats"})
    if goalie_table:
        for row in goalie_table.find("tbody").find_all("tr"):
            if row.get("class") and "thead" in row.get("class", []):
                continue

            player_cell = row.find("td", {"data-stat": "name_display"})
            if not player_cell or not player_cell.text.strip():
                continue

            name = player_cell.text.strip()
            if name in ("", "Team Total", "Total"):
                continue

            gp_cell  = row.find("td", {"data-stat": "goalie_games"})
            w_cell   = row.find("td", {"data-stat": "goalie_wins"})
            gaa_cell = row.find("td", {"data-stat": "goals_against_avg"})
            sv_cell  = row.find("td", {"data-stat": "save_pct_goalie"})
            so_cell  = row.find("td", {"data-stat": "goalie_shutouts"})

            gp  = parse_int(gp_cell.text)   if gp_cell  else 0
            w   = parse_int(w_cell.text)    if w_cell   else 0
            gaa = parse_float(gaa_cell.text) if gaa_cell else 0.0
            sv  = parse_float(sv_cell.text)  if sv_cell  else 0.0
            so  = parse_int(so_cell.text)   if so_cell  else 0

            if gp < 10:
                continue

            goalies.append({
                "name": name,
                "position": "G",
                "gp": gp,
                "wins": w,
                "gaa": gaa,
                "savePct": sv,
                "shutouts": so,
            })

    return skaters, goalies


def aggregate_players(season_data: list[dict], is_goalie: bool) -> list[dict]:
    """Aggregate multiple seasons of data per player."""
    by_name: dict[str, dict] = {}

    for p in season_data:
        name = p["name"]
        if name not in by_name:
            by_name[name] = dict(p)
            by_name[name]["season_count"] = 1
            by_name[name]["_all_positions"] = {p["position"]}  # track all positions seen
        else:
            existing = by_name[name]
            existing["gp"] += p["gp"]
            existing["season_count"] += 1
            existing["_all_positions"].add(p["position"])  # accumulate
            if is_goalie:
                existing["wins"] += p["wins"]
                existing["shutouts"] += p["shutouts"]
                # Weighted average for GAA and SV%
                total_gp = existing["gp"]
                w1 = (total_gp - p["gp"]) / total_gp
                w2 = p["gp"] / total_gp
                existing["gaa"] = existing["gaa"] * w1 + p["gaa"] * w2
                existing["savePct"] = existing["savePct"] * w1 + p["savePct"] * w2
            else:
                existing["goals"] += p["goals"]
                existing["assists"] += p["assists"]
                existing["points"] += p["points"]
                existing["plusMinus"] += p["plusMinus"]

    result = []
    for name, p in by_name.items():
        min_gp = 50 if is_goalie else 100
        if p["gp"] < min_gp:
            continue
        if not is_goalie:
            p["pointsPerGame"] = round(p["points"] / p["gp"], 3) if p["gp"] > 0 else 0
        # Persist all recorded positions; convert set to sorted list
        p["positions"] = sorted(p.pop("_all_positions", {p["position"]}))
        result.append(p)

    # Sort by relevance
    if is_goalie:
        result.sort(key=lambda x: (x["gp"], x["wins"]), reverse=True)
    else:
        result.sort(key=lambda x: x["points"], reverse=True)

    return result


ERA_AVERAGES = {
    "1950s": {"goalsPerGame": 2.55, "savePct": 0.920, "pointsPerGame": 0.38},
    "1960s": {"goalsPerGame": 3.02, "savePct": 0.912, "pointsPerGame": 0.44},
    "1970s": {"goalsPerGame": 3.30, "savePct": 0.890, "pointsPerGame": 0.52},
    "1980s": {"goalsPerGame": 3.90, "savePct": 0.872, "pointsPerGame": 0.62},
    "1990s": {"goalsPerGame": 2.95, "savePct": 0.893, "pointsPerGame": 0.52},
    "2000s": {"goalsPerGame": 2.72, "savePct": 0.902, "pointsPerGame": 0.48},
    "2010s": {"goalsPerGame": 2.73, "savePct": 0.911, "pointsPerGame": 0.48},
    "2020s": {"goalsPerGame": 3.00, "savePct": 0.906, "pointsPerGame": 0.52},
}


def calc_skater_strength(p: dict, decade: str) -> float:
    """0–100 strength score for a skater, era-normalized."""
    era = ERA_AVERAGES.get(decade, ERA_AVERAGES["2010s"])
    ppg = p.get("pointsPerGame", 0)
    era_ppg = era["pointsPerGame"]
    # Ratio to era average, capped and scaled
    ratio = ppg / era_ppg if era_ppg > 0 else 1.0
    # ratio of 1.0 = league average (~40 score)
    # ratio of 3.0 = generational (Gretzky ~95+)
    score = min(100, max(0, 20 + (ratio - 0.5) * 35))
    return round(score, 1)


def calc_goalie_strength(p: dict, decade: str) -> float:
    """0–100 strength score for a goalie, era-normalized."""
    era = ERA_AVERAGES.get(decade, ERA_AVERAGES["2010s"])
    sv = p.get("savePct", 0)
    era_sv = era["savePct"]
    diff = sv - era_sv  # e.g., +0.015 is excellent
    # Scale: +0.020 above average ≈ 90+, at average ≈ 50
    score = min(100, max(0, 50 + diff * 2500))
    return round(score, 1)


def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    all_players = []
    player_id = 1

    for game_abbr, display_name, city, decade_overrides in FRANCHISES:
        # Determine which decades this franchise covers
        if decade_overrides:
            active_decades = list(decade_overrides.keys())
        else:
            # Default: include all decades where this abbr exists (we'll skip 404s)
            active_decades = list(DECADES.keys())

        print(f"\n{'='*50}")
        print(f"  {city} {display_name} ({game_abbr})")
        print(f"{'='*50}")

        for decade in active_decades:
            if decade not in DECADES:
                continue

            hr_abbr = game_abbr
            if decade_overrides and decade in decade_overrides:
                hr_abbr = decade_overrides[decade]

            years = DECADES[decade]
            print(f"  {decade} (HR abbr: {hr_abbr})...", end=" ", flush=True)

            all_skaters_raw = []
            all_goalies_raw = []
            seasons_found = 0

            for year in years:
                skaters, goalies = scrape_season(hr_abbr, year)
                if skaters or goalies:
                    seasons_found += 1
                    all_skaters_raw.extend(skaters)
                    all_goalies_raw.extend(goalies)
                time.sleep(3.5)  # be polite to HR

            if seasons_found == 0:
                print("no data")
                continue

            print(f"{seasons_found} seasons scraped")

            # Aggregate
            skaters_agg = aggregate_players(all_skaters_raw, is_goalie=False)
            goalies_agg = aggregate_players(all_goalies_raw, is_goalie=True)

            # Take top players per position (enough choices for the draft)
            pos_groups: dict[str, list] = defaultdict(list)
            for p in skaters_agg:
                pos_groups[p["position"]].append(p)

            for pos, players in pos_groups.items():
                for p in players[:10]:  # top 10 per position slot
                    strength = calc_skater_strength(p, decade)
                    all_players.append({
                        "id": player_id,
                        "name": p["name"],
                        "initials": get_initials(p["name"]),
                        "position": pos,
                        "franchise": display_name,
                        "franchiseAbbr": game_abbr,
                        "city": city,
                        "decade": decade,
                        "stats": {
                            "gp": p["gp"],
                            "goals": p["goals"],
                            "assists": p["assists"],
                            "points": p["points"],
                            "plusMinus": p["plusMinus"],
                            "pointsPerGame": p["pointsPerGame"],
                        },
                        "strengthScore": strength,
                    })
                    player_id += 1

            for p in goalies_agg[:8]:  # top 8 goalies
                strength = calc_goalie_strength(p, decade)
                all_players.append({
                    "id": player_id,
                    "name": p["name"],
                    "initials": get_initials(p["name"]),
                    "position": "G",
                    "franchise": display_name,
                    "franchiseAbbr": game_abbr,
                    "city": city,
                    "decade": decade,
                    "stats": {
                        "gp": p["gp"],
                        "wins": p["wins"],
                        "gaa": round(p["gaa"], 2),
                        "savePct": round(p["savePct"], 3),
                        "shutouts": p["shutouts"],
                    },
                    "strengthScore": strength,
                })
                player_id += 1

    print(f"\n\nTotal players scraped: {len(all_players)}")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_players, f, indent=2, ensure_ascii=False)
    print(f"Written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
