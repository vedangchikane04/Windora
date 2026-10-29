import json
import logging
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime, timedelta

from app.config import settings

logger = logging.getLogger("windora.elexon")

class ElexonClient:
    """
    Robust client for querying the official Elexon BMRS Insights API.
    Supports local JSON caching, chunking, exponential backoff, and input validation.
    """
    def __init__(self, base_url: str = settings.ELEXON_BASE_URL, data_dir: Path = settings.DATA_DIR):
        self.base_url = base_url.rstrip("/")
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.client = httpx.Client(
            headers={"User-Agent": "Windora-Analytics/1.0", "Accept": "application/json"},
            timeout=30.0
        )

    def _get_cache_path(self, name: str) -> Path:
        return self.data_dir / f"{name}.json"

    def fetch_fuelhh_stream(
        self,
        settlement_date_from: str = "2026-01-01",
        settlement_date_to: str = "2026-01-31",
        fuel_type: str = "WIND",
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch FUELHH (half-hourly outturn generation by fuel type) stream.
        Filters for fuelType == 'WIND' as mandated.
        """
        cache_file = self._get_cache_path(f"fuelhh_{settlement_date_from}_{settlement_date_to}_{fuel_type.lower()}")
        default_jan_cache = self._get_cache_path("fuelhh_jan2026")
        
        # Check cached file
        if not force_refresh:
            if cache_file.exists():
                logger.info(f"Loading FUELHH from cache: {cache_file}")
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            elif default_jan_cache.exists() and settlement_date_from >= "2026-01-01" and settlement_date_to <= "2026-01-31":
                logger.info(f"Loading FUELHH from default Jan cache: {default_jan_cache}")
                with open(default_jan_cache, "r", encoding="utf-8") as f:
                    all_jan = json.load(f)
                    filtered = [
                        r for r in all_jan 
                        if r.get("settlementDate") and settlement_date_from <= r["settlementDate"] <= settlement_date_to
                        and r.get("fuelType") == fuel_type
                    ]
                    return filtered

        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": settlement_date_from,
            "settlementDateTo": settlement_date_to,
            "fuelType": fuel_type
        }
        logger.info(f"Requesting FUELHH from Elexon API: {url} with {params}")
        
        retries = 3
        backoff = 1.0
        while retries > 0:
            try:
                resp = self.client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                
                # Filter strictly for fuelType WIND and valid records
                cleaned = []
                seen = set()
                for r in data:
                    if r.get("fuelType") != fuel_type:
                        continue
                    key = (r.get("startTime"), r.get("settlementPeriod"))
                    if key in seen:
                        continue
                    seen.add(key)
                    # Validate generation is non-negative number
                    gen = r.get("generation")
                    if gen is not None and gen >= 0:
                        cleaned.append(r)
                
                logger.info(f"Successfully retrieved {len(cleaned)} cleaned FUELHH records")
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(cleaned, f)
                return cleaned
            except Exception as e:
                retries -= 1
                logger.warning(f"Error fetching FUELHH: {e}. Retries left: {retries}")
                if retries <= 0:
                    raise
                time.sleep(backoff)
                backoff *= 2.0

        return []

    def fetch_windfor_stream(
        self,
        publish_datetime_from: str = "2025-12-28T00:00:00Z",
        publish_datetime_to: str = "2026-02-02T00:00:00Z",
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch WINDFOR (Wind Generation Forecast) stream.
        """
        cache_file = self._get_cache_path("windfor_jan2026")
        if not force_refresh and cache_file.exists():
            logger.info(f"Loading WINDFOR from cache: {cache_file}")
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)

        logger.info(f"Fetching WINDFOR stream from {publish_datetime_from} to {publish_datetime_to}")
        # WINDFOR can be large, so chunk in 5-day windows to prevent timeouts
        start_dt = datetime.fromisoformat(publish_datetime_from.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(publish_datetime_to.replace("Z", "+00:00"))
        chunk_step = timedelta(days=5)

        all_records = []
        seen = set()

        curr = start_dt
        while curr < end_dt:
            next_step = min(curr + chunk_step, end_dt)
            p_from = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
            p_to = next_step.strftime("%Y-%m-%dT%H:%M:%SZ")
            url = f"{self.base_url}/datasets/WINDFOR/stream"
            params = {"publishDateTimeFrom": p_from, "publishDateTimeTo": p_to}
            
            retries = 3
            backoff = 1.0
            while retries > 0:
                try:
                    resp = self.client.get(url, params=params)
                    resp.raise_for_status()
                    chunk_data = resp.json()
                    for r in chunk_data:
                        pub = r.get("publishTime")
                        st = r.get("startTime")
                        gen = r.get("generation")
                        if pub and st and gen is not None and gen >= 0:
                            key = (pub, st)
                            if key not in seen:
                                seen.add(key)
                                all_records.append(r)
                    break
                except Exception as e:
                    retries -= 1
                    logger.warning(f"Error fetching WINDFOR chunk ({p_from} - {p_to}): {e}. Retries left: {retries}")
                    if retries <= 0:
                        raise
                    time.sleep(backoff)
                    backoff *= 2.0
            
            curr = next_step
            time.sleep(0.3)

        logger.info(f"Retrieved {len(all_records)} total unique WINDFOR records")
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(all_records, f)
        return all_records

    def close(self):
        self.client.close()

# Singleton instance
elexon_client = ElexonClient()
