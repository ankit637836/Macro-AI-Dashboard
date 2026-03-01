# Macro AI — SOFR & Fed Funds Intelligence Dashboard

> A full-stack financial analytics platform that visualizes how macroeconomic events move the SOFR forward curve — with AI-generated analyst commentary on every release.

🔗 **Live Demo:** [macro-ai-dashboard.vercel.app](https://macro-ai-dashboard.vercel.app)  
⚙️ **Backend API:** [macro-ai-dashboard.onrender.com/docs](https://macro-ai-dashboard.onrender.com/docs)

---

## What Is This?

Most fixed income traders manually track how CPI, NFP, and GDP releases affect short-term rate futures. This tool automates that process — pulling live data from the Federal Reserve (FRED), computing spread and butterfly structures across the SOFR curve, and generating plain-English AI analyst notes for any macro event since 2022.

Built by a SOFR/Fed Funds futures trader at Futures First, this project bridges professional trading knowledge with modern software engineering.

---

## What It Does

### 📈 SOFR Curve Visualizer
Displays live Term SOFR rates across four maturities — overnight, 30-day, 90-day, and 180-day averages. Shows the current curve shape as a bar chart and historical rate movement as an interactive line chart with selectable time ranges (3M, 6M, 1Y, All).

The chart clearly captures major macro regimes — you can see the Fed's aggressive rate hike cycle through 2023-2024 and the subsequent easing cycle beginning in late 2024.

### 📅 Macro Events Timeline
A scrollable, filterable timeline of every major economic release since January 2022:
- **CPI** — Consumer Price Index (headline + core)
- **NFP** — Nonfarm Payrolls
- **Unemployment Rate**
- **GDP** — Gross Domestic Product
- **PCE** — Personal Consumption Expenditures

Each release shows the absolute value, month-over-month change, and percentage change — color-coded by indicator with trend arrows.

### ⚡ Event Impact Analyzer
The core analytical feature. Select any macro release (e.g., CPI on 2024-03-12) and a time window (±3 to ±10 days), and the tool plots all four SOFR maturities before and after the event on a single chart — with a gold dashed vertical line marking the exact release date.

Rate change chips at the top show basis point moves per maturity, making it instantly clear whether the event caused bull flattening, bear steepening, or parallel shifts in the curve.

### 📊 Contract Analysis
Tracks 12 different rate structures across the SOFR curve with historical charts:

| Type | Contracts |
|------|-----------|
| **Outrights** | Overnight, 3M, 6M, 12M |
| **Calendar Spreads** | 3M, 6M, 9M, 24M |
| **Butterflies** | 3M, 6M |
| **Double Butterflies** | 3M, 6M |

Spreads and butterflies are computed in real-time from the underlying SOFR data — not stored separately. Stats chips show latest value, period high, period low, and average.

### 🤖 AI Insight
Sends structured event data (release value, MoM change, SOFR curve before/after) to Google Gemini and receives a 4-paragraph professional analyst note covering:
- Whether the print was hawkish or dovish
- Specific basis point moves per maturity
- Implications for the Fed rate path
- Curve shape dynamics (bull steepening, bear flattening, etc.)

---

## How It Looks

The dashboard uses a **Bloomberg-meets-editorial** design aesthetic:
- Dark charcoal sidebar with gold accents (`#f0c040`)
- Clean white content area with crisp data cards
- IBM Plex Mono for all numbers and labels
- Playfair Display for headings
- Recharts for all financial visualizations

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python + FastAPI** | REST API with 7 endpoints |
| **SQLAlchemy + SQLite** | Data storage and querying |
| **FRED API** (St. Louis Fed) | Live macroeconomic data source |
| **fredapi** | Python wrapper for FRED |
| **Google Gemini API** | AI-generated analyst commentary |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React** | UI framework |
| **Recharts** | Financial charts (line, bar) |
| **Axios** | API calls |
| **Lucide React** | Icons |
| **CSS Variables** | Design system / theming |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Render** | Backend hosting (free tier) |
| **Vercel** | Frontend hosting |
| **GitHub** | Version control |

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
│  /api/curve          → SOFR curve snapshot          │
│  /api/curve/range    → Historical rate data         │
│  /api/events         → Macro event releases         │
│  /api/event-impact   → Curve movement around event  │
│  /api/fed-funds      → Fed Funds rate history       │
│  /api/ai-summary     → Gemini AI analyst note       │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────┐    ┌──────────────────────────┐
│   SQLite DB      │    │   External APIs          │
│  (sofr.db)       │    │                          │
│                  │    │  FRED API (rate data)     │
│  sofr_curve      │    │  Google Gemini (AI)       │
│  fed_funds       │    └──────────────────────────┘
│  macro_events    │
└──────────────────┘
```

---

## Data Pipeline

```
FRED API
   │
   ├── fetch_futures.py   → Term SOFR rates (overnight, 30d, 90d, 180d avg)
   ├── fetch_events.py    → CPI, Core CPI, NFP, Unemployment, GDP, PCE
   │
   └── load_to_db.py      → Creates 3 tables, loads all historical data
                            sofr_curve: 4,000+ rows (date × maturity × rate)
                            fed_funds:  1,000+ rows
                            macro_events: 300+ rows
```

---

## Local Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- FRED API key (free at [fred.stlouisfed.org](https://fred.stlouisfed.org))
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt

# Create .env file
echo "FRED_API_KEY=your_key_here" > .env
echo "GEMINI_API_KEY=your_key_here" >> .env
echo "DATABASE_URL=sqlite:///./sofr.db" >> .env

# Load data
python data/load_to_db.py

# Start server
uvicorn main:app --reload
# API runs at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install

# Create .env file
echo "REACT_APP_API_URL=http://127.0.0.1:8000/api" > .env

npm start
# App runs at http://localhost:3000
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/curve` | GET | Latest SOFR curve snapshot |
| `/api/curve/range` | GET | Historical rate for a maturity over date range |
| `/api/events` | GET | All macro events (filterable by indicator) |
| `/api/event-impact` | GET | SOFR curve window around a specific event |
| `/api/fed-funds` | GET | Fed Funds rate history |
| `/api/ai-summary` | GET | AI analyst note for any macro event |
| `/api/health` | GET | API health check |

Full interactive documentation available at `/docs` (Swagger UI, auto-generated by FastAPI).

---

## Key Design Decisions

**Why FRED instead of CME data?**
FRED provides free, reliable, well-documented historical data via a clean API. CME futures data requires paid subscriptions. For the purpose of visualizing curve movements and macro event impacts, Term SOFR averages from FRED are an accurate and accessible proxy.

**Why SQLite instead of PostgreSQL?**
SQLite requires zero configuration and no separate database server. For a read-heavy dashboard with infrequent data updates (daily), SQLite is more than sufficient and dramatically simplifies deployment.

**Why compute spreads/butterflies on the frontend?**
Calendar spreads and butterflies are linear combinations of outrights (e.g., fly = front − 2×belly + back). Computing them in the frontend from already-fetched data avoids storing redundant derived data and makes it trivial to add new structures without backend changes.

**Why Gemini instead of GPT-4?**
Google Gemini provides a free API tier that is sufficient for this use case. The prompt is structured specifically around fixed income analysis — indicator value, MoM change, and before/after SOFR curve — so the quality of output is consistently professional regardless of model.

---

## Domain Context

This project is built around instruments actively traded in US short-term interest rate markets:

- **SOFR** (Secured Overnight Financing Rate) — the benchmark rate that replaced LIBOR, used as the reference for SR3 futures
- **Term SOFR** — forward-looking SOFR averages (30d, 90d, 180d) published by CME Group, used to represent the expected rate path
- **Calendar Spreads** — simultaneous long/short positions in adjacent contract months; sensitive to changes in the rate between two points
- **Butterflies** — three-legged structures (long front, short 2× belly, long back) that isolate curve curvature; profitable when the curve steepens or flattens non-linearly
- **Macro Event Impact** — CPI and NFP releases are the highest-impact events for SOFR futures; a surprise print can move the front end 10-20 bps in minutes

---

## Future Improvements

- [ ] Add actual release dates (vs. period dates) using an economic calendar API
- [ ] Compare multiple events side-by-side (e.g., last 5 CPI surprises)
- [ ] Add Fed dot plot visualization
- [ ] Market-implied Fed rate path calculator (like CME FedWatch)
- [ ] Email/Slack alerts for new macro releases
- [ ] Switch to PostgreSQL for production persistence

---

## Author

**Ankit Yadav**  
B.Tech Mathematics & Computing — IIT Ropar  
Analyst, Futures First Bangalore — Trading SOFR & Fed Funds futures (SR3, ZQ)  

[GitHub](https://github.com/ankit637836) · [LinkedIn](https://linkedin.com/in/ankit6378yadav)

---

*Data sourced from the Federal Reserve Bank of St. Louis (FRED). AI commentary generated by Google Gemini. This project is for educational and portfolio purposes only — not financial advice.*
