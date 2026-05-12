# 🚛 ELD Trip Planner

> A full-stack ELD (Electronic Logging Device) trip planning application that calculates HOS-compliant routes for property-carrying drivers and generates FMCSA-format daily log sheets — built with Django and React.

---

## 🔗 Live Demo

Access the deployed application here: 👉 [https://spotter-eld-trip-planner-omega.vercel.app](https://spotter-eld-trip-planner-omega.vercel.app)

**Backend API:** [https://spotter-eld-trip-planner-production.up.railway.app/api](https://spotter-eld-trip-planner-production.up.railway.app/api)

---

## 🎬 Demo Video

A 3–5 minute walkthrough covering the app demo, edge cases, and code architecture.

🎥 [Watch the Loom walkthrough] [https://www.loom.com/share/c2aa7d4721fd44489765546c38eedd1c](https://www.loom.com/share/c2aa7d4721fd44489765546c38eedd1c)

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, Django 5, Django REST Framework |
| **Frontend** | React 18, TypeScript, Vite 8 |
| **UI Library** | Material UI v7 |
| **Maps** | Mapbox GL JS via react-map-gl v8 |
| **Geocoding** | Mapbox Geocoding API (autocomplete + reverse) |
| **Routing** | Mapbox Directions API (single waypoint call) |
| **PDF Export** | jsPDF + svg2pdf.js |
| **Deployment** | Vercel (frontend) + Railway (backend) |

---

## ✨ Features

### 📍 Route Planning
- **Real road routing** via Mapbox Directions API — not straight lines
- **Single API call with waypoints:** current → pickup → dropoff
- **Color-coded stop markers** with clickable popups showing arrival time, duration, and stop reason
- **"Use My Location"** button with browser geolocation

### 📋 HOS Rules Engine (FMCSA Compliant)

Implements all **2020+ FMCSA Hours of Service** rules for property-carrying drivers:

| Rule | Description |
|------|------------|
| 11-Hour Driving Limit | Max 11h driving after 10h off-duty |
| 14-Hour Window | Cannot drive after 14th hour on-duty (doesn't pause for breaks) |
| 30-Minute Break | Required after 8h driving — any non-driving time ≥30min qualifies (2020 rule) |
| 70-Hour/8-Day Cycle | Cannot exceed 70h on-duty in 8 consecutive days |
| 34-Hour Restart | 34h off-duty resets the 70h cycle to zero |
| 10-Hour Off-Duty | Required between shifts, resets driving + window limits |

Additional logic:
- **Fuel stops** every 1,000 miles (0.5h on-duty-not-driving)
- **1h pickup + 1h dropoff** as on-duty-not-driving
- **Fuel stop ≥30min satisfies the break requirement** (no double-stops)
- **Cycle availability check** before pickup/dropoff deduction

### 📄 Daily Log Sheets (SVG)

The core output — FMCSA-format daily logs drawn in SVG:

- **4 duty status rows** across 24 hours (Midnight to Midnight)
- **Colored status bars** for each active period
- **Vertical transition lines** between status changes (authentic look)
- **Hour + 15-minute gridlines**
- **Total hours per row** — guaranteed to sum to exactly **24.0**
- **Timestamped remarks** for every event
- **Shipping documents section** (placeholder fields)
- **70-Hour/8-Day recap table** with columns A, B, C matching the official FMCSA form
- **Midnight splitting** — activities crossing midnight appear correctly in both days

### 📊 Trip Summary
- Total distance, duration, number of stops, log days
- Estimated fuel cost (total_miles / 6.5 MPG × $3.80/gal)
- Stop timeline with chronological flow

### 📥 PDF Export
- Export all daily log sheets as a print-ready PDF
- One landscape page per log day via jsPDF + svg2pdf.js

---

## 🏗 Architecture

```
Frontend (React + TypeScript + MUI)
  ├── TripForm + LocationAutocomplete  →  User inputs
  ├── RouteMap (Mapbox GL JS)          →  Route + markers
  ├── TripSummary + StopTimeline       →  Results overview
  └── LogSheet (SVG) + LogSheetList    →  Daily log rendering + PDF

                    ↕ Axios (REST API)

Backend (Django + DRF)
  ├── POST /api/trip-plan/             →  Plan a trip
  ├── GET  /api/trip-plan/{id}/        →  Retrieve saved plan
  └── Services:
       ├── route_service.py            →  Mapbox Directions + reverse geocoding
       ├── hos_engine.py               →  HOS simulation (core algorithm)
       └── log_generator.py            →  Timeline → daily log sheets
```

### How the HOS Engine Works

The core of the application is the `_simulate_driving` function in `hos_engine.py`. At each step, it calculates the maximum driveable time before hitting **any** limit:

```python
max_drive = min(
    state.driving_remaining,          # 11h driving limit
    state.window_remaining,           # 14h window
    8.0 - state.driving_since_break,  # 30min break threshold
    state.cycle_remaining,            # 70h cycle
    hours_to_fuel,                    # 1000-mile fuel limit
    remaining_hours,                  # trip distance left
)
```

Whichever limit is closest determines the next driving segment. Then the appropriate stop is inserted (break, fuel, overnight rest, or 34h restart) and the loop continues.

---

## 🧪 Testing

```bash
cd backend
python manage.py test -v 2
```

**25 tests. All passing.**

```
trips/tests/test_hos_engine.py — 11 tests
  ✅ Short trip with no mandatory stops
  ✅ Short trip produces driving segments
  ✅ 11h driving limit triggers overnight rest
  ✅ 8h driving triggers 30-min break
  ✅ Pickup resets break clock (2020 FMCSA rule)
  ✅ Fuel stop at 1,000 miles
  ✅ Fuel stop satisfies break requirement
  ✅ 34h restart when 70h cycle exhausted
  ✅ Pickup checks cycle before deducting
  ✅ Extreme cycle usage (69.5h)
  ✅ 14h window expires before 11h driving limit

trips/tests/test_log_generator.py — 5 tests
  ✅ Single-day trip sums to 24.0h
  ✅ Correct status distribution
  ✅ Two-day trip (both days sum to 24.0h)
  ✅ Midnight splitting
  ✅ 70h recap includes pre-trip cycle hours

trips/tests/test_route_service.py — 5 tests
  ✅ Haversine same point = 0
  ✅ Chicago to Indy ≈ 180 miles
  ✅ Interpolation at 0 miles = start
  ✅ Interpolation beyond route = end
  ✅ Midpoint is between start and end

trips/tests/test_views.py — 4 tests
  ✅ Empty body returns 400
  ✅ Cycle > 70 returns 400
  ✅ Missing location returns 400
  ✅ Nonexistent plan returns 404
```

---

## 🔧 How to Run Locally

### Prerequisites
- Python 3.12+
- Node.js 18+
- Mapbox access token ([get one free](https://account.mapbox.com/))

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
cp ../.env.example ../.env
# Fill in MAPBOX_ACCESS_TOKEN in .env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in VITE_MAPBOX_TOKEN in .env.local
npm run dev
```

### ⚙️ Environment Variables

**backend/.env**
```
MAPBOX_ACCESS_TOKEN=pk.your-token-here
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**frontend/.env.local**
```
VITE_MAPBOX_TOKEN=pk.your-token-here
VITE_API_URL=http://localhost:8000/api
```

---

## 📡 API Reference

### `POST /api/trip-plan/`

Plan a new trip with HOS-compliant stops.

**Request:**
```json
{
  "current_location": { "address": "Chicago, IL", "lat": 41.8781, "lng": -87.6298 },
  "pickup_location": { "address": "Indianapolis, IN", "lat": 39.7684, "lng": -86.1581 },
  "dropoff_location": { "address": "Nashville, TN", "lat": 36.1627, "lng": -86.7816 },
  "current_cycle_used": 20
}
```

**Response:** Route geometry, stops array, driving segments, daily logs with entries/totals/remarks/recap.

### `GET /api/trip-plan/{id}/`

Retrieve a previously saved trip plan.

---

## 🧠 Technical Decisions & Trade-offs

### 1. Single Mapbox Route Call (not two)

**Decision:** One Directions API call with waypoints `current → pickup → dropoff` instead of two separate calls.

**Reasoning:** Halves API calls, returns a single continuous geometry, and ensures routing through the waypoint is optimal. The response includes per-leg distances and durations which the HOS engine needs.

### 2. Stops vs Driving Segments (separated)

**Decision:** The API returns `stops` (fuel, rest, pickup, dropoff) and `driving_segments` as separate arrays.

**Reasoning:** The frontend uses `stops` for map markers (you don't want a marker for every driving period). The log generator uses both merged chronologically to build the timeline.

### 3. 2020 FMCSA Break Rule

**Decision:** Any non-driving time ≥30 minutes satisfies the mandatory break — including fuel stops and pickup/dropoff.

**Reasoning:** The pre-2020 rule required off-duty/sleeper berth specifically. The updated rule is simpler and more accurate. This means a 30-min fuel stop doubles as the mandatory break — no unnecessary double-stops.

### 4. 34h Restart as Baseline (not over-delivery)

**Decision:** The 34h restart is implemented in the core engine, not as an optional feature.

**Reasoning:** Without it, any trip where the 70h cycle runs out creates an infinite loop — the 10h rest doesn't reset the cycle, so the driver can never resume. The 34h restart is a correctness requirement, not a nice-to-have.

### 5. Reverse Geocoding with Cache

**Decision:** `@lru_cache` with pre-rounded coordinates (2 decimal places ≈ 1.1km precision).

**Reasoning:** Multiple stops can be near the same city. Rounding before caching ensures nearby points share cache entries, reducing Mapbox API calls from 30+ to ~5-10 per trip.

---

## 📦 Project Structure

```
spotter-eld-trip-planner/
├── backend/
│   ├── config/                 # Django settings, URLs, WSGI
│   ├── trips/
│   │   ├── models.py           # TripPlan model (UUID pk, JSON results)
│   │   ├── serializers.py      # DRF request/response serializers
│   │   ├── views.py            # API endpoints
│   │   ├── services/
│   │   │   ├── route_service.py    # Mapbox API + interpolation + geocoding
│   │   │   ├── hos_engine.py       # HOS rules simulation
│   │   │   └── log_generator.py    # Daily log sheet generation
│   │   └── tests/              # 25 unit tests
│   ├── requirements.txt
│   ├── Procfile                # Railway deployment
│   └── build.sh                # Railway build script
├── frontend/
│   ├── src/
│   │   ├── components/         # React components (7 files)
│   │   ├── hooks/              # useTripPlanner state hook
│   │   ├── services/           # Axios API client
│   │   ├── types/              # TypeScript interfaces
│   │   └── theme.ts            # MUI theme (navy + orange)
│   └── vite.config.ts
└── README.md
```

---

## 📋 What I'd Improve With More Time

| Improvement | Why |
|------------|-----|
| Sleeper berth split provisions (7/3, 8/2) | FMCSA allows split rest periods for flexibility |
| Real truck stop POI lookup | Place fuel/rest stops at actual truck stops, not arbitrary route points |
| Real-time traffic integration | Mapbox Traffic API for more accurate duration estimates |
| Responsive mobile layout | Stack sidebar below map on small screens |
| Print CSS (@media print) | Clean paper output for log sheets |
| WebSocket for long trips | Avoid HTTP timeout on 5000+ mile route calculations |
| Redis caching for routes | Avoid re-calling Mapbox for repeated trips |

---

## 👤 Author

Developed by **Paulo Cardoso** — Full Stack Developer focused on building scalable, production-ready web applications.

[GitHub](https://github.com/paulo-cardoso71)
