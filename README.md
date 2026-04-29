# Macro AI — SOFR & Fed Funds Intelligence Dashboard

> A full-stack financial analytics platform that visualizes how macroeconomic events move rate and commodity markets — with AI-generated analyst commentary on every release.

🔗 **Live Demo:** [macro-ai-dashboard.vercel.app](https://macro-ai-dashboard.vercel.app)  
⚙️ **Backend API:** [macro-ai-dashboard.onrender.com/docs](https://macro-ai-dashboard.onrender.com/docs)

---

## What Is This?

Most fixed income traders manually track how CPI, NFP, and GDP releases affect short-term rate futures and commodity markets. This tool automates that process — pulling live data from the Federal Reserve (FRED) and Yahoo Finance, computing spread and butterfly structures across the SOFR curve, showing cross-asset reactions in a single view, and generating plain-English AI analyst notes for any macro event since 2022.

Built by a SOFR/Fed Funds futures trader at Futures First, this project bridges professional trading knowledge with modern software engineering.

---

## What It Does

### 📈 SOFR Curve Visualizer
Displays live Term SOFR rates across four maturities — overnight, 30-day, 90-day, and 180-day averages. Shows the current curve shape as a bar chart and historical rate movement as an interactive line chart with selectable time ranges (3M, 6M, 1Y, All).

### 📅 Macro Events Timeline
A scrollable, filterable timeline of every major economic release since January 2022 — CPI, NFP, Unemployment, GDP, PCE and FOMC decisions. Each release shows absolute value, month-over-month change, and percentage change — color-coded by indicator with trend arrows.

### ⚡ Event Impact Analyzer
Select any macro release and a time window (±3 to ±10 days). The tool plots all four SOFR maturities before and after the event on a single chart — with a gold dashed vertical line marking the release date. Rate change chips show basis point moves per maturity.

### 🌍 Cross Market Reaction
The most powerful analytical view. Select any macro event and see how **all major markets moved simultaneously** around it:

| Market | Description |
|--------|-------------|
| WTI Crude (CL) | US oil benchmark |
| Brent Crude (BZ) | Global oil benchmark |
| Gold (GC) | Safe haven / inflation hedge |
| USD Index (DXY) | Dollar strength |
| Natural Gas (NG) | Energy market |
| SOFR 90D | Short-term US rate expectations |
| SONIA | UK overnight rate |

Each market shows a mini chart with the event marked, pre→post price, and % change. A summary bar shows all markets at a glance. No free tool currently provides cross-asset macro impact in one view.

### 🏗️ Contract Builder
Build any SR3 (SOFR) or ZQ (Fed Funds) rate structure using actual quarterly contract months — Jun26, Sep26, Dec26, Mar27 and more:

| Structure | Description |
|-----------|-------------|
| Outright | Single contract price history |
| Calendar Spread | Front − Back (e.g., Dec26 − Mar27) |
| Butterfly | Front − 2× Belly + Back |
| Double Butterfly | 4-legged curvature structure |

Macro events (CPI, NFP, GDP, FOMC) are marked as colored vertical lines on the chart — filter by event type to isolate specific impacts.

### 📊 Contract Analysis
12 pre-built rate structures across the SOFR curve — outrights, calendar spreads, butterflies and double butterflies — with historical charts and stats (latest, high, low, average).

### 🤖 AI Insight
Sends structured event data to Google Gemini and returns a 4-paragraph professional analyst note covering hawkish/dovish interpretation, specific bps moves per maturity, Fed rate path implications, and curve shape dynamics.

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python + FastAPI** | REST API with 10+ endpoints |
| **SQLAlchemy + SQLite** | Data storage and querying |
| **FRED API** | Live macroeconomic + rate data |
| **yfinance** | Yahoo Finance — CL, BZ, GC, DXY, NG prices |
| **Google Gemini API** | AI-generated analyst commentary |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React** | UI framework |
| **Recharts** | Financial charts |
| **Axios** | API calls |
| **Lucide React** | Icons |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Render** | Backend hosting |
| **Vercel** | Frontend hosting |
| **GitHub** | Version control + CI/CD |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│              (Vercel — vercel.app)                  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (axios)
                       ▼
┌─────────────────────────────────────────────────────┐
│               FastAPI Backend                        │
│            (Render — onrender.com)                  │
│                                                     │
│  /api/curve            → SOFR curve snapshot        │
│  /api/curve/range      → Historical rate data       │
│  /api/events           → Macro event releases       │
│  /api/event-impact     → Curve movement around event│
│  /api/cross-market     → All markets around event   │
│  /api/contract-builder → SR3/ZQ structure builder   │
│  /api/fomc             → FOMC rate decisions        │
│  /api/markets          → CL, BZ, GC, DXY, NG       │
│  /api/ai-summary       → Gemini AI analyst note     │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────┐    ┌──────────────────────────┐
│   SQLite DB      │    │   External APIs          │
│  sofr_curve      │    │  FRED (rates)            │
│  fed_funds       │    │  Yahoo Finance (markets) │
│  macro_events    │    │  Google Gemini (AI)      │
│  market_prices   │    └──────────────────────────┘
│  fomc_events     │
│  sonia_rates     │
└──────────────────┘
```

---

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt

# Create .env
FRED_API_KEY=your_key
GEMINI_API_KEY=your_key
DATABASE_URL=sqlite:///./sofr.db

python data/load_to_db.py
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://127.0.0.1:8000/api" > .env
npm start
```

---

## Domain Context

- **SOFR** — benchmark rate replacing LIBOR, reference for SR3 futures
- **Term SOFR** — forward-looking averages representing the expected rate path
- **Calendar Spreads** — long/short adjacent contract months; sensitive to rate changes between two dates
- **Butterflies** — three-legged structures isolating curve curvature
- **Cross-Asset Macro** — CPI and NFP releases simultaneously move rates, energy, gold and currencies
- **FOMC** — Fed rate decisions are the single largest driver of short-term rate futures

---

## Future Improvements

- [ ] Macro Event Playbook — historical distribution of market reactions to similar surprises
- [ ] Fed rate probability calculator (like CME FedWatch)
- [ ] FOMC statement tone analyzer
- [ ] Real SR3 contract prices from CME settlement data
- [ ] Actual release dates from an economic calendar API

---

## Author

**Ankit**  
B.Tech Mathematics & Computing — IIT Ropar  
Analyst, Futures First Bangalore — Trading SOFR & Fed Funds futures (SR3, ZQ)

[GitHub](https://github.com/ankit637836) · [LinkedIn](https://www.linkedin.com/in/ankit-80062b1b9/)

---

*Data from FRED and Yahoo Finance. AI by Google Gemini. For educational and portfolio purposes only — not financial advice.*
