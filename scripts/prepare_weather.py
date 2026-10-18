"""Download 2025 hourly weather for Hanover County Municipal Airport (KOFP) from the
Iowa Environmental Mesonet ASOS archive and write the one file the app ships.

Run once at build time: python scripts/prepare_weather.py
The app never fetches weather at runtime.
"""
import csv, io, json, math, urllib.request
from datetime import datetime, timedelta

URL = ("https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=OFP&data=tmpf&data=relh"
       "&year1=2025&month1=1&day1=1&year2=2026&month2=1&day2=1&tz=America/New_York"
       "&format=onlycomma&latlon=no&missing=M&trace=T&direct=no&report_type=3")
RAW = "data/raw/kofp-2025.csv"
OUT = "public/data/kofp-2025.json"


def main():
    with urllib.request.urlopen(URL, timeout=120) as r:
        text = r.read().decode("utf-8")
    import os
    os.makedirs("data/raw", exist_ok=True)
    os.makedirs("public/data", exist_ok=True)
    open(RAW, "w", encoding="utf-8").write(text)

    obs = []
    for row in csv.DictReader(io.StringIO(text)):
        if row["tmpf"] in ("M", "") or row["relh"] in ("M", ""):
            continue
        t = datetime.strptime(row["valid"], "%Y-%m-%d %H:%M")
        obs.append((t, (float(row["tmpf"]) - 32) * 5 / 9, float(row["relh"])))

    # One value per hour: the observation nearest the top of the hour, within 30 minutes.
    start = datetime(2025, 1, 1)
    slots = [None] * 8760
    best = [math.inf] * 8760
    for t, tc, rh in obs:
        nearest = (t + timedelta(minutes=30)).replace(minute=0, second=0)
        i = int((nearest - start).total_seconds() // 3600)
        if 0 <= i < 8760:
            d = abs((t - nearest).total_seconds())
            if d < best[i] and d <= 1800:
                best[i], slots[i] = d, (tc, rh)

    # Fill short gaps by linear interpolation; flag any gap longer than 3 hours.
    filled, long_gaps, i = 0, [], 0
    while i < 8760:
        if slots[i] is not None:
            i += 1
            continue
        j = i
        while j < 8760 and slots[j] is None:
            j += 1
        a = slots[i - 1] if i > 0 else slots[j]
        b = slots[j] if j < 8760 else a
        n = j - i + 1
        for k in range(i, j):
            f = (k - i + 1) / n
            slots[k] = (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
        filled += j - i
        if j - i > 3:
            long_gaps.append([i, j - i])
        i = j

    out = {
        "station": "KOFP",
        "name": "Hanover County Municipal Airport",
        "source": "Iowa Environmental Mesonet ASOS archive, routine reports",
        "year": 2025,
        "timezone": "America/New_York",
        "units": {"t": "degC", "rh": "percent"},
        "filledHours": filled,
        "longGaps": long_gaps,
        "t": [round(s[0], 2) for s in slots],
        "rh": [round(min(100.0, max(1.0, s[1])), 1) for s in slots],
    }
    json.dump(out, open(OUT, "w"), separators=(",", ":"))
    hottest = max(range(8760), key=lambda k: out["t"][k])
    print(f"observations {len(obs)}, filled {filled} h, long gaps {len(long_gaps)}, "
          f"hottest hour {start + timedelta(hours=hottest)} at {out['t'][hottest]} C")


if __name__ == "__main__":
    main()
