#!/usr/bin/env python3
"""Debug: fetch one HR team page and show what tables exist."""
import time
import requests
from bs4 import BeautifulSoup
import re

URL = "https://www.hockey-reference.com/teams/MTL/1975.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

resp = requests.get(URL, headers=HEADERS, timeout=15)
print(f"Status: {resp.status_code}")
print(f"Content-type: {resp.headers.get('content-type')}")
print()

soup = BeautifulSoup(resp.text, "html.parser")

# Find all tables (including those in HTML comments — HR hides some behind comments)
tables = soup.find_all("table")
print(f"Tables found directly: {len(tables)}")
for t in tables:
    print(f"  id={t.get('id')}  class={t.get('class')}")

# HR often puts tables inside HTML comments — parse those too
print()
comments = soup.find_all(string=lambda text: isinstance(text, str) and '<table' in text)
print(f"Comments containing <table>: {len(comments)}")
for c in comments:
    inner = BeautifulSoup(c, "html.parser")
    for t in inner.find_all("table"):
        print(f"  [in comment] id={t.get('id')}  class={t.get('class')}")

# Print first 2000 chars of raw HTML so we can see structure
print()
print("=== First 3000 chars of HTML ===")
print(resp.text[:3000])
