#!/usr/bin/env python3
"""
Seed a sample players.json with curated all-time greats.
Use this to test the app before running the full scrape.

Usage: python scripts/seed_sample.py
"""
import json, os

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "data", "players.json")
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

def p(id, name, pos, abbr, franchise, city, decade, stats, strength):
    initials = "".join(w[0] for w in name.split() if w)[:2].upper()
    return {
        "id": id, "name": name, "initials": initials,
        "position": pos, "franchise": franchise, "franchiseAbbr": abbr,
        "city": city, "decade": decade, "stats": stats, "strengthScore": strength,
    }

def skater(gp, g, a, pts, pm):
    return {"gp": gp, "goals": g, "assists": a, "points": pts, "plusMinus": pm,
            "pointsPerGame": round(pts / gp, 3)}

def goalie(gp, w, gaa, sv, so):
    return {"gp": gp, "wins": w, "gaa": gaa, "savePct": sv, "shutouts": so}

players = [
    # ── EDM 1980s ──────────────────────────────────────────────────────────────
    p(1,  "Wayne Gretzky",     "C",  "EDM","Oilers",    "Edmonton",    "1980s", skater(696,583,1086,1669,  6), 99),
    p(2,  "Jari Kurri",        "RW", "EDM","Oilers",    "Edmonton",    "1980s", skater(697,474, 569,1043, 50), 89),
    p(3,  "Glenn Anderson",    "LW", "EDM","Oilers",    "Edmonton",    "1980s", skater(625,417, 489, 906, 98), 84),
    p(4,  "Paul Coffey",       "RD", "EDM","Oilers",    "Edmonton",    "1980s", skater(532,209, 534, 743,162), 90),
    p(5,  "Charlie Huddy",     "LD", "EDM","Oilers",    "Edmonton",    "1980s", skater(521, 60, 247, 307,173), 65),
    p(6,  "Grant Fuhr",        "G",  "EDM","Oilers",    "Edmonton",    "1980s", goalie(423,226,3.43,0.881, 14), 82),

    # ── MTL 1970s ──────────────────────────────────────────────────────────────
    p(7,  "Guy Lafleur",       "RW", "MTL","Canadiens", "Montreal",    "1970s", skater(680,518, 686,1204,363), 95),
    p(8,  "Pete Mahovlich",    "C",  "MTL","Canadiens", "Montreal",    "1970s", skater(490,174, 330, 504,125), 73),
    p(9,  "Steve Shutt",       "LW", "MTL","Canadiens", "Montreal",    "1970s", skater(558,387, 358, 745,218), 85),
    p(10, "Larry Robinson",    "LD", "MTL","Canadiens", "Montreal",    "1970s", skater(671, 89, 447, 536,462), 88),
    p(11, "Serge Savard",      "RD", "MTL","Canadiens", "Montreal",    "1970s", skater(583, 83, 283, 366,228), 76),
    p(12, "Ken Dryden",        "G",  "MTL","Canadiens", "Montreal",    "1970s", goalie(397,258,2.24,0.922, 46), 95),

    # ── BOS 1970s ──────────────────────────────────────────────────────────────
    p(13, "Bobby Orr",         "LD", "BOS","Bruins",    "Boston",      "1970s", skater(396,204, 527, 731,439), 99),
    p(14, "Phil Esposito",     "C",  "BOS","Bruins",    "Boston",      "1970s", skater(562,459, 553,1012,186), 95),
    p(15, "Ken Hodge",         "RW", "BOS","Bruins",    "Boston",      "1970s", skater(380,182, 274, 456,125), 74),
    p(16, "Wayne Cashman",     "LW", "BOS","Bruins",    "Boston",      "1970s", skater(484,156, 282, 438,362), 70),
    p(17, "Dallas Smith",      "RD", "BOS","Bruins",    "Boston",      "1970s", skater(470, 55, 172, 227,266), 65),
    p(18, "Gerry Cheevers",    "G",  "BOS","Bruins",    "Boston",      "1970s", goalie(324,229,2.89,0.905, 26), 83),

    # ── PIT 1990s ──────────────────────────────────────────────────────────────
    p(19, "Mario Lemieux",     "C",  "PIT","Penguins",  "Pittsburgh",  "1990s", skater(406,379, 576, 955, 58), 97),
    p(20, "Jaromir Jagr",      "RW", "PIT","Penguins",  "Pittsburgh",  "1990s", skater(439,349, 448, 797,169), 94),
    p(21, "Ron Francis",       "LW", "PIT","Penguins",  "Pittsburgh",  "1990s", skater(528,189, 402, 591, 34), 82),
    p(22, "Larry Murphy",      "RD", "PIT","Penguins",  "Pittsburgh",  "1990s", skater(512,115, 329, 444,112), 77),
    p(23, "Ulf Samuelsson",    "LD", "PIT","Penguins",  "Pittsburgh",  "1990s", skater(452, 54, 185, 239, 80), 68),
    p(24, "Tom Barrasso",      "G",  "PIT","Penguins",  "Pittsburgh",  "1990s", goalie(460,252,3.26,0.899, 18), 79),

    # ── NYI 1980s ──────────────────────────────────────────────────────────────
    p(25, "Mike Bossy",        "RW", "NYI","Islanders", "New York",    "1980s", skater(452,413, 378, 791,118), 94),
    p(26, "Bryan Trottier",    "C",  "NYI","Islanders", "New York",    "1980s", skater(480,262, 468, 730, 59), 88),
    p(27, "Clark Gillies",     "LW", "NYI","Islanders", "New York",    "1980s", skater(476,223, 271, 494, 73), 74),
    p(28, "Denis Potvin",      "LD", "NYI","Islanders", "New York",    "1980s", skater(504,189, 437, 626,176), 91),
    p(29, "Stefan Persson",    "RD", "NYI","Islanders", "New York",    "1980s", skater(419, 55, 228, 283,180), 63),
    p(30, "Billy Smith",       "G",  "NYI","Islanders", "New York",    "1980s", goalie(454,252,3.13,0.889, 22), 81),

    # ── DET 1990s ──────────────────────────────────────────────────────────────
    p(31, "Steve Yzerman",     "C",  "DET","Red Wings", "Detroit",     "1990s", skater(478,254, 409, 663, 56), 91),
    p(32, "Brendan Shanahan",  "LW", "DET","Red Wings", "Detroit",     "1990s", skater(326,154, 143, 297, 62), 80),
    p(33, "Sergei Fedorov",    "RW", "DET","Red Wings", "Detroit",     "1990s", skater(384,221, 282, 503,192), 90),
    p(34, "Nicklas Lidstrom",  "LD", "DET","Red Wings", "Detroit",     "1990s", skater(492, 87, 318, 405,206), 92),
    p(35, "Larry Murphy",      "RD", "DET","Red Wings", "Detroit",     "1990s", skater(199, 32, 102, 134, 48), 68),
    p(36, "Dominik Hasek",     "G",  "DET","Red Wings", "Detroit",     "1990s", goalie(176,116,2.10,0.926, 22), 93),

    # ── COL 1990s ──────────────────────────────────────────────────────────────
    p(37, "Joe Sakic",         "C",  "COL","Avalanche", "Colorado",    "1990s", skater(361,200, 317, 517, 79), 92),
    p(38, "Peter Forsberg",    "C",  "COL","Avalanche", "Colorado",    "1990s", skater(289,166, 335, 501,170), 96),
    p(39, "Valeri Kamensky",   "LW", "COL","Avalanche", "Colorado",    "1990s", skater(280,126, 179, 305, 61), 76),
    p(40, "Claude Lemieux",    "RW", "COL","Avalanche", "Colorado",    "1990s", skater(218, 93,  92, 185, 57), 70),
    p(41, "Sandis Ozolinsh",   "RD", "COL","Avalanche", "Colorado",    "1990s", skater(239, 62, 138, 200,109), 76),
    p(42, "Uwe Krupp",         "LD", "COL","Avalanche", "Colorado",    "1990s", skater(154, 22,  60,  82, 46), 60),
    p(43, "Patrick Roy",       "G",  "COL","Avalanche", "Colorado",    "1990s", goalie(262,172,2.38,0.921, 37), 96),

    # ── PHI 1970s ──────────────────────────────────────────────────────────────
    p(44, "Bobby Clarke",      "C",  "PHI","Flyers",    "Philadelphia","1970s", skater(625,252, 535, 787,183), 90),
    p(45, "Bill Barber",       "LW", "PHI","Flyers",    "Philadelphia","1970s", skater(508,232, 294, 526,154), 76),
    p(46, "Reggie Leach",      "RW", "PHI","Flyers",    "Philadelphia","1970s", skater(469,306, 210, 516, 73), 82),
    p(47, "Andre Dupont",      "LD", "PHI","Flyers",    "Philadelphia","1970s", skater(405, 45, 163, 208,160), 63),
    p(48, "Tom Bladon",        "RD", "PHI","Flyers",    "Philadelphia","1970s", skater(385, 75, 196, 271,109), 65),
    p(49, "Bernie Parent",     "G",  "PHI","Flyers",    "Philadelphia","1970s", goalie(441,232,2.42,0.921, 55), 93),

    # ── MTL 1950s ──────────────────────────────────────────────────────────────
    p(50, "Jean Beliveau",     "C",  "MTL","Canadiens", "Montreal",    "1950s", skater(384,186, 243, 429, 0), 91),
    p(51, "Bernie Geoffrion",  "RW", "MTL","Canadiens", "Montreal",    "1950s", skater(394,196, 153, 349, 0), 83),
    p(52, "Dickie Moore",      "LW", "MTL","Canadiens", "Montreal",    "1950s", skater(352,163, 185, 348, 0), 81),
    p(53, "Doug Harvey",       "LD", "MTL","Canadiens", "Montreal",    "1950s", skater(420, 68, 300, 368, 0), 93),
    p(54, "Tom Johnson",       "RD", "MTL","Canadiens", "Montreal",    "1950s", skater(374, 41, 148, 189, 0), 68),
    p(55, "Jacques Plante",    "G",  "MTL","Canadiens", "Montreal",    "1950s", goalie(393,262,2.14,0.930, 58), 97),

    # ── NJD 1990s──────────────────────────────────────────────────────────────
    p(56, "Dave Andreychuk",   "LW", "NJD","Devils",    "New Jersey",  "1990s", skater(213, 89, 104, 193, 21), 72),
    p(57, "Scott Stevens",     "LD", "NJD","Devils",    "New Jersey",  "1990s", skater(449, 74, 241, 315,127), 84),
    p(58, "Ken Daneyko",       "RD", "NJD","Devils",    "New Jersey",  "1990s", skater(477, 26,  71,  97, 21), 60),
    p(59, "Doug Gilmour",      "C",  "NJD","Devils",    "New Jersey",  "1990s", skater(183, 47, 113, 160, 32), 73),
    p(60, "Petr Sykora",       "RW", "NJD","Devils",    "New Jersey",  "1990s", skater(266, 77,  97, 174, 22), 68),
    p(61, "Martin Brodeur",    "G",  "NJD","Devils",    "New Jersey",  "1990s", goalie(400,259,2.29,0.913, 44), 95),

    # ── TBL 2010s──────────────────────────────────────────────────────────────
    p(62, "Steven Stamkos",    "C",  "TBL","Lightning", "Tampa Bay",   "2010s", skater(442,249, 277, 526, 67), 93),
    p(63, "Nikita Kucherov",   "RW", "TBL","Lightning", "Tampa Bay",   "2010s", skater(432,193, 316, 509, 87), 94),
    p(64, "Ondrej Palat",      "LW", "TBL","Lightning", "Tampa Bay",   "2010s", skater(382,108, 167, 275, 63), 72),
    p(65, "Victor Hedman",     "LD", "TBL","Lightning", "Tampa Bay",   "2010s", skater(484, 75, 296, 371,177), 91),
    p(66, "Ryan McDonagh",     "RD", "TBL","Lightning", "Tampa Bay",   "2010s", skater(192, 18,  75,  93, 51), 68),
    p(67, "Andrei Vasilevskiy","G",  "TBL","Lightning", "Tampa Bay",   "2010s", goalie(342,204,2.58,0.919, 21), 91),

    # ── CHI 2010s──────────────────────────────────────────────────────────────
    p(68, "Jonathan Toews",    "C",  "CHI","Blackhawks","Chicago",     "2010s", skater(450,209, 266, 475,139), 90),
    p(69, "Patrick Kane",      "RW", "CHI","Blackhawks","Chicago",     "2010s", skater(476,220, 331, 551, 56), 93),
    p(70, "Marian Hossa",      "LW", "CHI","Blackhawks","Chicago",     "2010s", skater(354,167, 178, 345, 73), 84),
    p(71, "Duncan Keith",      "LD", "CHI","Blackhawks","Chicago",     "2010s", skater(486, 62, 266, 328,145), 88),
    p(72, "Brent Seabrook",    "RD", "CHI","Blackhawks","Chicago",     "2010s", skater(484, 81, 186, 267, 98), 74),
    p(73, "Corey Crawford",    "G",  "CHI","Blackhawks","Chicago",     "2010s", goalie(396,223,2.41,0.919, 28), 87),

    # ── WSH 2010s──────────────────────────────────────────────────────────────
    p(74, "Alex Ovechkin",     "LW", "WSH","Capitals",  "Washington",  "2010s", skater(420,317, 234, 551,  8), 97),
    p(75, "Nicklas Backstrom", "C",  "WSH","Capitals",  "Washington",  "2010s", skater(416,130, 323, 453, 87), 88),
    p(76, "Tom Wilson",        "RW", "WSH","Capitals",  "Washington",  "2010s", skater(344, 95, 100, 195, 62), 73),
    p(77, "John Carlson",      "RD", "WSH","Capitals",  "Washington",  "2010s", skater(476, 93, 271, 364, 98), 86),
    p(78, "Matt Niskanen",     "LD", "WSH","Capitals",  "Washington",  "2010s", skater(291, 38, 117, 155, 76), 70),
    p(79, "Braden Holtby",     "G",  "WSH","Capitals",  "Washington",  "2010s", goalie(363,214,2.54,0.916, 32), 88),

    # ── QUE 1980s──────────────────────────────────────────────────────────────
    p(80, "Peter Stastny",     "C",  "QUE","Nordiques", "Quebec",      "1980s", skater(554,380, 668,1048, 42), 93),
    p(81, "Anton Stastny",     "LW", "QUE","Nordiques", "Quebec",      "1980s", skater(469,215, 366, 581, 30), 81),
    p(82, "Michel Goulet",     "LW", "QUE","Nordiques", "Quebec",      "1980s", skater(571,395, 460, 855, 43), 91),
    p(83, "Marian Stastny",    "RW", "QUE","Nordiques", "Quebec",      "1980s", skater(322,118, 165, 283,  5), 72),
    p(84, "Dave Maloney",      "LD", "QUE","Nordiques", "Quebec",      "1980s", skater(170, 20,  55,  75,-15), 58),
    p(85, "Randy Moller",      "RD", "QUE","Nordiques", "Quebec",      "1980s", skater(420, 46, 140, 186, 21), 62),
    p(86, "Dan Bouchard",      "G",  "QUE","Nordiques", "Quebec",      "1980s", goalie(211,100,3.79,0.875, 11), 68),

    # ── MNS 1980s──────────────────────────────────────────────────────────────
    p(87, "Neal Broten",       "C",  "MNS","North Stars","Minnesota",  "1980s", skater(476,158, 345, 503, 54), 80),
    p(88, "Dino Ciccarelli",   "RW", "MNS","North Stars","Minnesota",  "1980s", skater(454,293, 267, 560, 43), 86),
    p(89, "Steve Payne",       "LW", "MNS","North Stars","Minnesota",  "1980s", skater(354,166, 198, 364, 73), 73),
    p(90, "Craig Hartsburg",   "LD", "MNS","North Stars","Minnesota",  "1980s", skater(434, 88, 285, 373,148), 78),
    p(91, "Brad Maxwell",      "RD", "MNS","North Stars","Minnesota",  "1980s", skater(371, 88, 238, 326, 60), 72),
    p(92, "Gilles Meloche",    "G",  "MNS","North Stars","Minnesota",  "1980s", goalie(275,117,3.63,0.876, 13), 65),

    # ── EDM 2020s ──────────────────────────────────────────────────────────────
    p(93, "Connor McDavid",    "C",  "EDM","Oilers",    "Edmonton",    "2020s", skater(246,134, 267, 401, 45), 99),
    p(94, "Leon Draisaitl",    "LW", "EDM","Oilers",    "Edmonton",    "2020s", skater(246,149, 208, 357, 19), 96),
    p(95, "Zach Hyman",        "LW", "EDM","Oilers",    "Edmonton",    "2020s", skater(181, 82,  75, 157, 40), 76),
    p(96, "Evan Bouchard",     "RD", "EDM","Oilers",    "Edmonton",    "2020s", skater(197, 41, 117, 158, 30), 77),
    p(97, "Darnell Nurse",     "LD", "EDM","Oilers",    "Edmonton",    "2020s", skater(197, 31,  75, 106,-22), 66),
    p(98, "Stuart Skinner",    "G",  "EDM","Oilers",    "Edmonton",    "2020s", goalie(145, 73,3.03,0.904, 5), 74),
]

with open(OUTPUT, "w") as f:
    json.dump(players, f, indent=2)

print(f"Seeded {len(players)} players to {OUTPUT}")
