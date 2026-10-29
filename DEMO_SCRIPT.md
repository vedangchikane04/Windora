# Windora — Video Demo Script (10-Minute Walkthrough)

**Project:** Windora — UK Wind Forecast & Accuracy Intelligence  
**Focus Period:** January 1–31, 2026 (UK National Grid BMRS Data)  
**Target Audience:** Energy Utility Wholesale Procurement Teams, Power Traders & Energy Quantitative Analysts

---

## PART 1: Client Presentation & Product Demonstration (Minutes 0:00 – 5:00)

### 0:00 – 1:00: Business Objective & Wholesale Procurement Context
- **Presenter:** *"Hello everyone, welcome to the demonstration of **Windora**, an enterprise-grade UK electricity day-ahead wind generation forecasting and accuracy intelligence platform."*
- **Problem Statement:**
  - In Great Britain's wholesale power market, utilities purchase electricity day-ahead in daily auctions (such as EPEX SPOT GB) to hedge expected consumer demand.
  - Wind power is weather-dependent and non-dispatchable. If day-ahead wind generation is overforecast, actual delivery will fall short, forcing the utility to scramble for replacement generation in intraday markets or pay severe imbalance cashout penalties under the Balancing Mechanism.
  - Conversely, underforecasting leads to contracting excess fossil or thermal capacity, leaving surplus wind that must be sold at low spot prices or curtailed.
- **Value Proposition:**
  - Windora equips power traders and procurement managers with historical day-ahead forecast reconstruction, rigorous error metrics, and directional decision support using solely official Elexon BMRS datasets (`FUELHH` and `WINDFOR`).

---

### 1:00 – 2:30: Executive Overview & The Forecast vs Actual Dashboard
- **Screen:** Show `http://localhost:5173/` (Executive Overview tab).
- **Key Walkthrough Points:**
  - **Metadata Strip:** Notice the verified status: UK National Grid Balancing Mechanism, with complete January 2026 outturn data ingested (1,488 half-hour settlement periods).
  - **Date Navigator:** Show delivery date selector (January 15, 2026) and demonstrate the stepper moving across delivery days.
  - **Top-Level KPI Cards:**
    - *Actual Delivered Energy:* e.g., 234,420 MWh delivered on Jan 15 with peak generation of 14,200 MW.
    - *Day-Ahead Forecast Energy:* 226,100 MWh expected at decision time.
    - *Daily MAE (Mean Absolute Error):* e.g., 680 MW per 30-minute settlement period.
    - *Forecast Bias (Mean Error):* e.g., -346 MW underforecasting bias.
  - **Interactive Time-Series Chart:**
    - Hover over settlement period 24 (12:00 UTC). Show the rich tooltip detailing Delivery Interval, Settlement Period, Actual MW (FUELHH), Day-Ahead Forecast (WINDFOR), Error MW, and the Selected Publication Timestamp.
    - Toggle individual chart series: show/hide Actual generation area, Day-Ahead Forecast line, and Error bar differential.

---

### 2:30 – 3:45: Forecast Revision History Inspection (Combating Lookahead Bias)
- **Screen:** Click on any 30-minute interval on the chart or table (or navigate to the *Forecast Revisions* tab).
- **Presenter:** *"Here is Windora's critical innovation: historical forecast reconstruction with strict lookahead bias elimination."*
- **Walkthrough Points:**
  - Notice the **D-1 11:00 GMT Decision Cutoff**. EPEX SPOT day-ahead gate closure occurs at 11:00 GMT on D-1.
  - Examine the **Forecast Revision Trajectory Chart**:
    - For delivery at 12:00 UTC on Jan 15, Elexon published up to 24 distinct forecast versions starting 3 days prior.
    - Points before 11:00 GMT on Jan 14 are marked **Eligible**. The latest eligible forecast (published at 09:30 UTC on D-1) is highlighted with a gold beacon.
    - Subsequent runs published after 11:00 GMT on D-1 and throughout intraday are classified as **Ineligible (Post-Cutoff)**.
    - Emphasize: *Windora never uses a forecast published after the cutoff for day-ahead evaluations.*

---

### 3:45 – 5:00: Accuracy Intelligence & Qualitative Procurement Decision Support
- **Screen:** Navigate to *Accuracy Intelligence* and then *Procurement Support*.
- **Accuracy Intelligence:**
  - Point out the monthly toggle: evaluate the selected day or all 31 days of January 2026.
  - Review **MAE (Mean Absolute Error)**, **RMSE (Root Mean Square Error)**, and **Mean Error (Bias)**.
  - Highlight the **Methodological Disclosure on MAPE vs WAPE**:
    - Explain why standard MAPE explodes when wind generation approaches zero (calm periods).
    - Show how Windora applies an epsilon guard (>= 50 MW) for defensible MAPE and provides **WAPE (Weighted Absolute Percentage Error)** as the industry standard.
  - Examine the **Error Distribution Histogram**: see the spread across severe underforecast, moderate, balanced, and overforecast intervals.
- **Procurement Support:**
  - Highlight the mandatory compliance disclaimer: *Qualitative Decision Support Only*.
  - Show the **Shortfall Risk Card (Overforecast)** vs **Surplus Risk Card (Underforecast)**.
  - Show the interval-by-interval volume exposure table displaying net MWh exposure and directional trading advice.

---

## PART 2: Technical Architecture, Testing & Containerization (Minutes 5:00 – 10:00)

### 5:00 – 6:15: Architecture & Data Processing Pipeline
- **Screen:** Show codebase directory layout in IDE (`backend/` and `frontend/`).
- **Presenter:** *"Now let's examine the engineering architecture that powers Windora."*
- **Backend Architecture (`FastAPI` + `Pandas` + `NumPy`):**
  - `backend/app/config.py`: Centralized configuration, default cutoffs, CORS, and data paths.
  - `backend/app/utils/timestamps.py`: Rigorous handling of `Europe/London` timezone vs UTC, British Summer Time (BST) daylight-saving edge cases, and half-hour settlement period calculation.
  - `backend/app/services/elexon_client.py`: Robust client interfacing Elexon's BMRS REST endpoints:
    - `FUELHH/stream`: Ingests outturn generation, filters `fuelType == 'WIND'`, validates `generation >= 0`.
    - `WINDFOR/stream`: Ingests wind generation forecasts across chunked windows with exponential backoff and persistent caching in `backend/data/cache/`.
  - Zero external dependencies: no unpermitted weather, price, or third-party APIs introduced.

---

### 6:15 – 7:30: Forecast Selection Algorithm & Accuracy Service
- **Screen:** Open `backend/app/services/forecast_selection.py` and `backend/app/services/accuracy.py`.
- **Forecast Selection Mechanics:**
  - Walk through `reconstruct_day_ahead_intervals`:
    1. For delivery interval $T$, compute calendar date $D$ in UK local time.
    2. Compute gate closure cutoff: $(D - 1)$ at configured `cutoff_time` (default 11:00 GMT).
    3. Filter all candidate forecasts for $T$ where `publishTime <= cutoff`.
    4. Select the candidate with $\max(\text{publishTime})$.
    5. Handle missing actuals or forecasts without silently replacing with zero.
    6. Explain the resolution matching modes:
       - **Hour Block Mapping (48 SP):** WINDFOR is published at hourly resolution (`:00`); hour block mapping maps the hourly MW forecast across both 30-min settlement periods of that delivery hour, preserving all 48 actual intervals.
       - **Exact Timestamp Match (24 SP):** Strict string matching on `:00` timestamps.
- **Accuracy Metrics Calculation:**
  - Review NumPy vector operations for MAE, RMSE, Mean Error / Bias, WAPE, and the defensible MAPE epsilon guard.

---

### 7:30 – 8:30: Frontend Architecture (`React` + `TypeScript` + `Tailwind CSS`)
- **Screen:** Open `frontend/src/`.
- **Key Modules:**
  - `App.tsx`: Global reactive state for date, cutoff, resolution mode, and drawer inspection.
  - `components/Navbar.tsx`: Professional header with live metadata and global controls.
  - `components/ForecastChart.tsx`: Built with `Recharts` ComposedChart, custom SVG tooltips, and interactive click-to-inspect.
  - `components/ForecastHistoryDrawer.tsx`: Slid-in drawer for rapid drill-down on forecast revisions.
  - `components/AccuracyView.tsx`: Multi-dimensional statistical views, trends, and error histograms.
  - `components/ProcurementDecisionView.tsx`: Qualitative procurement exposure breakdowns.

---

### 8:30 – 9:15: Automated Testing Suite
- **Screen:** Terminal running `pytest`.
- **Command:**
  ```powershell
  $env:PYTHONPATH='backend'; python -m pytest backend/tests -v
  ```
- **Demonstration:**
  - Run the test suite live on screen.
  - Point out that **all 17 unit and integration tests pass with 0 errors and 0 warnings**:
    - `test_latest_eligible_forecast_selected`: verifies correct chronological selection.
    - `test_exclusion_of_forecasts_published_after_cutoff`: proves post-cutoff forecasts are strictly blocked.
    - `test_missing_actual_and_missing_forecast_handling`: validates no silent zeros.
    - `test_mae_rmse_bias_calculations`: deterministic verification of mathematical formulas.
    - `test_mape_and_wape_with_near_zero_actuals`: confirms epsilon guard and WAPE stability.
    - `test_day_ahead_cutoff_bst_summer_time`: verifies daylight saving transitions (BST vs GMT).
    - `test_health_endpoint`, `test_overview_endpoint`, `test_forecasts_endpoint_valid`, `test_forecast_history_endpoint`.

---

### 9:15 – 10:00: Docker Containerization, Deployment & Wrap-Up
- **Screen:** Open `docker-compose.yml` and show Docker build.
- **Containerization Walkthrough:**
  - `backend/Dockerfile`: Multi-stage Python 3.12-slim image with non-root setup and healthcheck.
  - `frontend/Dockerfile`: Multi-stage Node 22 build with Alpine Nginx serving static assets and proxying `/api`.
  - Root `docker-compose.yml`: Launches both services with `docker compose up --build`.
- **Cloud Deployment Readiness:**
  - `frontend/vercel.json`: Single Page Application rewrite rules for seamless Vercel hosting.
  - `render.yaml`: Blueprint configuring backend Python web service and static frontend on Render.
- **Conclusion:**
  - *"Windora delivers a complete, statistically rigorous, and beautifully designed Day-Ahead Wind Forecasting Intelligence platform for UK power markets. Thank you!"*
