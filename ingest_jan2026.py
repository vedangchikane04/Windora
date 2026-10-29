import urllib.request
import json
import os
import time
from datetime import datetime, timedelta

CACHE_DIR = "backend/data/cache"
os.makedirs(CACHE_DIR, exist_ok=True)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"

def fetch_fuelhh():
    cache_path = os.path.join(CACHE_DIR, "fuelhh_jan2026.json")
    if os.path.exists(cache_path):
        print(f"FUELHH already cached at {cache_path}")
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    print("Fetching FUELHH Jan 2026...")
    url = f"{BASE_URL}/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31&fuelType=WIND"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    print(f"Fetched {len(data)} FUELHH records. Saving to cache...")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data

def fetch_windfor():
    cache_path = os.path.join(CACHE_DIR, "windfor_jan2026.json")
    if os.path.exists(cache_path):
        print(f"WINDFOR already cached at {cache_path}")
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    print("Fetching WINDFOR in 5-day chunks from 2025-12-28 to 2026-02-02...")
    all_records = []
    seen = set()

    start_date = datetime(2025, 12, 28, 0, 0, 0)
    end_date = datetime(2026, 2, 2, 0, 0, 0)
    chunk_size = timedelta(days=5)

    curr = start_date
    while curr < end_date:
        next_chunk = min(curr + chunk_size, end_date)
        from_str = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        to_str = next_chunk.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = f"{BASE_URL}/datasets/WINDFOR/stream?publishDateTimeFrom={from_str}&publishDateTimeTo={to_str}"
        print(f"  Fetching WINDFOR {from_str} to {to_str}...")
        
        retries = 3
        while retries > 0:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    chunk_data = json.loads(resp.read().decode('utf-8'))
                for r in chunk_data:
                    # deduplicate by (publishTime, startTime)
                    key = (r.get("publishTime"), r.get("startTime"))
                    if key not in seen:
                        seen.add(key)
                        all_records.append(r)
                print(f"    Got {len(chunk_data)} records (total unique so far: {len(all_records)})")
                break
            except Exception as e:
                retries -= 1
                print(f"    Retrying chunk due to error: {e}")
                time.sleep(2)
        curr = next_chunk
        time.sleep(0.5)

    print(f"Fetched {len(all_records)} total unique WINDFOR records. Saving to cache...")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(all_records, f)
    return all_records

if __name__ == "__main__":
    fuel = fetch_fuelhh()
    wf = fetch_windfor()
    print("Ingestion complete!")
    print(f"FUELHH records: {len(fuel)}")
    print(f"WINDFOR records: {len(wf)}")
