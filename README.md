# Windora — UK Wind Forecast & Accuracy Intelligence

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/pytest-17%20passed-brightgreen.svg)](https://pytest.org/)

**Windora** is a production-quality UK electricity day-ahead wind generation forecasting and accuracy analysis platform. It empowers utility power procurement teams, traders, and quantitative analysts to reconstruct historical wind forecasts available at gate closure, quantify forecast errors, evaluate systematic prediction biases, and understand the directional implications for wholesale power procurement.

---

## 1. Business Objective

UK energy utilities purchase electricity in the day-ahead wholesale market (such as EPEX SPOT GB Day-Ahead Auctions) to balance anticipated consumer electricity demand. Wind generation is weather-dependent and non-dispatchable:

* **Overforecast Risk (Wind Shortfall):** When actual wind generation is lower than planned, the utility is physically *short*. To avoid severe System Buy Price (SBP) cashout charges under the Balancing Mechanism, procurement teams must purchase replacement energy in intraday markets or dispatch backup thermal generation.
* **Underforecast Risk (Wind Surplus):** When actual wind output exceeds forecasts, the utility is physically *long*. The utility may have over-hedged from thermal or alternative sources, leaving surplus clean power that must be spilled or sold at discounted System Sell Prices (SSP).

Windora reconstructs the exact forecast intelligence that was available to decision-makers at market gate closure, without lookahead bias, and compares it directly against verified settlement outturn data.

---

## 2. Technology Stack & Architecture

```
                       ┌───────────────────────────────────────────┐
                       │           Official Elexon BMRS            │
                       │   FUELHH (Actuals) & WINDFOR (Forecasts)  │
                       └─────────────────────┬─────────────────────┘
                                             │ REST Stream / JSON
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WINDORA BACKEND (FastAPI)                             │
│                                                                                 │
│  ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────┐  │
│  │   Elexon API Client   │──>│  Forecast Selection   │──>│ Accuracy Service  │  │
│  │ (Retries & Persisted) │   │ (Lookahead Cutoff D-1)│   │(MAE, RMSE, Bias)  │  │
│  └───────────────────────┘   └───────────────────────┘   └───────────────────┘  │
│                                            │                                    │
│                                    FastAPI REST API                             │
└────────────────────────────────────────────┬────────────────────────────────────┘
                                             │ HTTP / JSON
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        WINDORA FRONTEND (React + Vite)                          │
│                                                                                 │
│   ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐  │
│   │ Executive Overview  │  │  Forecast vs Actual  │  │ Accuracy Intelligence │  │
│   │ (KPIs & Freshness)  │  │ (30-min Recharts)    │  │ (Trends & Histograms) │  │
│   └─────────────────────┘  └──────────────────────┘  └───────────────────────┘  │
│   ┌───────────────────────────────────────────────┐  ┌───────────────────────┐  │
│   │     Forecast History & Revision Inspector     │  │  Procurement Support  │  │
│   │    (Full Elexon Publication Timeline Drill)   │  │ (Directional Exposure)│  │
│   └───────────────────────────────────────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide React.
* **Backend:** Python 3.12+, FastAPI, Pandas, NumPy, Pydantic v2, HTTPX.
* **Data Ingestion & Cache:** Local JSON/persistent streaming cache with verified January 2026 Elexon datasets.
* **Containerization:** Docker, multi-stage Dockerfiles, Docker Compose.
* **Cloud Compatibility:** Vercel (Frontend SPA) and Render / Heroku (Python Backend).

---

## 3. Directory Structure

```
Windora/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py             # FastAPI REST endpoints
│   │   ├── schemas/
│   │   │   └── forecast.py           # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── accuracy.py           # MAE, RMSE, Bias, WAPE & error distribution
│   │   │   ├── elexon_client.py      # Elexon BMRS API client with caching
│   │   │   └── forecast_selection.py # Historical day-ahead cutoff reconstruction
│   │   ├── utils/
│   │   │   └── timestamps.py         # UK local time (Europe/London), DST, settlement periods
│   │   ├── config.py                 # Pydantic BaseSettings & CORS configuration
│   │   └── main.py                   # FastAPI lifespan application entrypoint
│   ├── data/
│   │   └── cache/                    # Persisted Elexon January 2026 datasets
│   │       ├── fuelhh_jan2026.json   # 1,488 actual wind outturn records
│   │       └── windfor_jan2026.json  # 21,024 published forecast records
│   ├── tests/
│   │   ├── test_accuracy.py          # MAE, RMSE, Bias, and WAPE unit tests
│   │   ├── test_api.py               # FastAPI integration tests
│   │   ├── test_forecast_selection.py# Cutoff exclusion and lookahead tests
│   │   └── test_timestamps.py        # UK timezone, DST, and settlement period tests
│   ├── Dockerfile                    # Multi-stage Python 3.12 backend container
│   └── requirements.txt              # Production Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccuracyView.tsx               # Statistical accuracy tab & distribution
│   │   │   ├── ForecastChart.tsx              # Interactive 30-min Recharts component
│   │   │   ├── ForecastHistoryDrawer.tsx      # Slide-in revision inspector
│   │   │   ├── ForecastRevisionHistoryView.tsx# Dedicated publication evolution view
│   │   │   ├── ForecastView.tsx               # Detailed settlement period table
│   │   │   ├── KpiCard.tsx                    # Accessible KPI metric cards
│   │   │   ├── Navbar.tsx                     # Header with global market controls
│   │   │   ├── OverviewView.tsx               # Executive dashboard summary
│   │   │   └── ProcurementDecisionView.tsx    # Directional procurement analysis
│   │   ├── services/
│   │   │   └── api.ts                         # Typed client communicating with backend
│   │   ├── types/
│   │   │   └── index.ts                       # TypeScript interfaces
│   │   ├── App.tsx                            # Root state management & tabs
│   │   ├── index.css                          # Tailwind v4 theme & custom utilities
│   │   └── main.tsx                           # React entrypoint
│   ├── Dockerfile                    # Multi-stage Nginx + Node build container
│   ├── nginx.conf                    # SPA routing and API reverse-proxy
│   ├── package.json                  # Frontend dependencies
│   ├── vite.config.ts                # Vite plugins and dev server proxy
│   └── vercel.json                   # Vercel SPA routing rules
├── .dockerignore                     # Docker build exclusions
├── .env.example                      # Documented environment variables
├── docker-compose.yml                # Multi-service container orchestration
├── DEMO_SCRIPT.md                    # 10-minute presentation & code walkthrough script
├── render.yaml                       # Render cloud deployment blueprint
└── README.md                         # Comprehensive project documentation
```

---

## 4. Data Sources & API Ingestion

Windora strictly adheres to the permitted data sources and uses **only** the two official Elexon BMRS datasets:

1. **Actual Wind Generation (`FUELHH`):**
   * Endpoint: `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
   * Filtering: `fuelType == "WIND"`.
   * Delivery Interval: `startTime` (ISO 8601 UTC).
   * Outturn Generation: `generation` (MW).
   * Complete Coverage: All 1,488 half-hour settlement periods across January 1–31, 2026.
2. **Wind Generation Forecast (`WINDFOR`):**
   * Endpoint: `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
   * Delivery Interval: `startTime` (ISO 8601 UTC).
   * Publication Timestamp: `publishTime` (ISO 8601 UTC).
   * Forecast Generation: `generation` (MW).
   * Ingested Horizon: Publications between December 28, 2025 and February 2, 2026 (21,024 unique forecast iterations).

### Domain Finding: Resolution Matching
* In Elexon BMRS, `FUELHH` outturn is reported at **30-minute settlement period resolution** (48 periods per standard day).
* `WINDFOR` forecasts are published at **hourly resolution** (`:00` of each hour).
* Windora supports two defensible matching modes (selectable via UI or API):
  * **Hour Block Mapping (Default, 48 SP):** The hourly forecast at `HH:00` applies to both half-hour settlement periods of that delivery hour (`HH:00` and `HH:30`), standard practice in UK power trading.
  * **Exact Match (24 SP):** Evaluates only the exact half-hour intervals where `actual.startTime == forecast.startTime` (`:00` timestamps).

---

## 5. Forecast Selection Methodology

To eliminate **lookahead bias** and accurately simulate true market decision conditions:

1. **Identify Delivery Interval:** For each delivery interval $T$ on delivery day $D$.
2. **Determine Decision Cutoff:**
   * Day-ahead market participants close their physical positions before gate closure on $D - 1$.
   * **Explicit Modelling Assumption:** The default cutoff is **11:00 GMT on D-1**, reflecting the EPEX SPOT GB Day-Ahead Auction deadline. Users can configure this cutoff to 12:00 GMT (Nord Pool), 17:00 GMT, or custom hours.
3. **Filter Candidate Forecasts:**
   $$\text{Eligible Forecasts} = \{ f \in \text{WINDFOR} \mid f.\text{startTime} = T \land f.\text{publishTime} \le \text{Cutoff} \}$$
4. **Select Latest Forecast:**
   $$f^* = \arg\max_{f \in \text{Eligible Forecasts}} (f.\text{publishTime})$$
5. **Strict Exclusion:** Any forecast published with `publishTime > Cutoff` is labeled **Ineligible** and strictly excluded from day-ahead metrics.
6. **Integrity:** Missing actuals or forecasts are preserved as `None` / `null` and never silently replaced with zero.

---

## 6. Metric Definitions & Units

All power generation and error metrics are expressed in **MW** (Megawatts) and energy in **MWh** (Megawatt-hours).

| Metric | Formula | Explanation |
| :--- | :--- | :--- |
| **MAE** | $\frac{1}{N} \sum_{i=1}^N \|F_i - A_i\|$ | Mean Absolute Error. Average magnitude of forecast errors in MW. |
| **RMSE** | $\sqrt{\frac{1}{N} \sum_{i=1}^N (F_i - A_i)^2}$ | Root Mean Squared Error in MW. Penalizes large error outliers. |
| **Mean Error (Bias)** | $\frac{1}{N} \sum_{i=1}^N (F_i - A_i)$ | Signed Bias. Positive = Systematic Overprediction; Negative = Systematic Underprediction. |
| **WAPE** | $\frac{\sum \|F_i - A_i\|}{\sum A_i} \times 100\%$ | Weighted Absolute Percentage Error. Stable, volume-weighted percentage metric widely favored in wholesale energy trading. |
| **Defensible MAPE** | $\frac{100\%}{M} \sum_{A_i \ge 50} \frac{\|F_i - A_i\|}{A_i}$ | Mean Absolute Percentage Error calculated strictly with an $\epsilon = 50\text{ MW}$ guard to prevent division-by-zero distortion during calm wind conditions. |
| **Forecast Coverage** | $\frac{\text{Valid Matched Pairs}}{\text{Expected Intervals}} \times 100\%$ | Ratio of verified intervals to expected settlement periods (48/day). |

---

## 7. Qualitative Procurement Decision Support

Windora provides qualitative decision support mapping forecast errors directly to physical and financial exposures:

* **Overforecast ($F_i > A_i$): Wind Shortfall Risk**
  * Planned wind exceeds actual outturn.
  * *Exposure:* Utility is physically short in balancing; may need to purchase replacement intraday energy or incur System Buy Price (SBP) cashout charges.
* **Underforecast ($F_i < A_i$): Wind Surplus Risk**
  * Actual wind exceeds planned schedule.
  * *Exposure:* Utility contracted excess thermal/baseload power; surplus wind must be sold or spilled at discounted System Sell Prices (SSP).
* **Compliance Label:** Explicitly labeled as qualitative decision guidance. Net procurement positions depend on consumer demand, portfolio contracts, and intraday prices outside the Elexon wind scope.

---

## 8. Local Setup & Running

### Prerequisites
* Python 3.12 or higher
* Node.js v20+ and npm

### 1. Backend Setup
```bash
# From workspace root
cd backend

# Create and activate virtual environment (optional)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will be live at `http://127.0.0.1:8000`. Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The frontend dashboard will be live at `http://127.0.0.1:5173`.

---

## 9. Docker & Docker Compose

To run the complete Windora stack in isolated production containers:

```bash
# Build and launch both frontend and backend
docker compose up --build
```

* **Frontend:** Accessible at `http://localhost:3000`
* **Backend API:** Accessible at `http://localhost:8000`
* **API Documentation:** Accessible at `http://localhost:8000/docs`

To stop the containers:
```bash
docker compose down
```

---

## 10. Automated Testing

Windora features a comprehensive automated test suite covering deterministic fixtures, cutoff exclusion, duplicate deduplication, mathematical formulas, and daylight-saving edge cases:

```bash
# Run pytest from the repository root
$env:PYTHONPATH='backend'; python -m pytest backend/tests -v
```

### Test Coverage Highlights:
* `test_latest_eligible_forecast_selected`: Verifies that among multiple forecast runs before cutoff, the latest one is chosen.
* `test_exclusion_of_forecasts_published_after_cutoff`: Verifies that forecasts published after gate closure are strictly rejected.
* `test_missing_actual_and_missing_forecast_handling`: Confirms that missing records are never replaced with silent zeros.
* `test_mae_rmse_bias_calculations`: Deterministic mathematical check for accuracy formulas.
* `test_mape_and_wape_with_near_zero_actuals`: Verifies the 50 MW epsilon guard on MAPE and volume weighting on WAPE.
* `test_day_ahead_cutoff_bst_summer_time`: Confirms proper UTC offset conversion during British Summer Time (BST).
* `test_health_endpoint`, `test_overview_endpoint`, `test_forecasts_endpoint_valid`, `test_forecast_history_endpoint`: End-to-end API integration verification.

---

## 11. Cloud Deployment Guide

### Frontend Deployment (Vercel)
1. Push the repository to GitHub.
2. In the Vercel Dashboard, import the repository and set the **Root Directory** to `frontend`.
3. Set the Environment Variable:
   * `VITE_API_BASE_URL`: URL of your deployed backend (e.g. `https://windora-backend.onrender.com`).
4. Vercel automatically reads `frontend/vercel.json` to handle SPA route rewrites.

### Backend Deployment (Render / Heroku)
1. Connect the GitHub repository in Render.
2. Render automatically detects the root `render.yaml` blueprint.
3. Alternatively, create a **Web Service**:
   * **Root Directory:** `backend`
   * **Environment:** Python
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   * **Health Check Path:** `/api/health`

---

## 12. Known Limitations

* **External Data Exclusions:** In strict accordance with project requirements, Windora introduces zero external weather, customer demand, intraday market prices, or thermal generation fleet data. Net financial procurement balances are therefore qualitative.
* **Forecast Granularity:** Elexon's `WINDFOR` dataset is published at hourly resolution, while `FUELHH` outturn is reported half-hourly. While Hour Block Mapping provides full 48 settlement period coverage, granular intraday ramp variations within the half-hour are bounded by the hourly forecast broadcast.
* **Winter Focus:** Historical data analysis is focused on January 2026. While the timestamp utilities support British Summer Time (BST), January is entirely in GMT (UTC+0).

---

## 13. AI Assistance Disclosure

In compliance with project guidelines, this application was developed with the assistance of agentic AI coding assistants (Google DeepMind Antigravity). AI assistance was used for initial architectural scaffolding, API exploration, mathematical test synthesis, and UI styling, with full human engineering review, domain verification against Elexon standards, and automated test validation.
