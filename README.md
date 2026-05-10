# ELD Trip Planner

A full-stack application for planning truck trips with FMCSA Hours of Service (HOS) compliance. Input trip details, get a route with mandatory stops, and generate official-format daily log sheets.

## Features

- **Route Planning:** Mapbox-powered routing with waypoint support
- **HOS Compliance:** Full FMCSA property-carrying driver rules (11h driving, 14h window, 30min break, 70h/8-day cycle, 34h restart)
- **Daily Log Sheets:** SVG-rendered FMCSA daily logs with grid, transitions, remarks, and 70h recap
- **PDF Export:** Download log sheets as print-ready PDF
- **Fuel Stops:** Automatic fuel stops every 1,000 miles
- **Trip Summary:** Distance, duration, stops, estimated fuel cost

## Tech Stack

- **Backend:** Django 5 + Django REST Framework + Python 3.12
- **Frontend:** React 18 + TypeScript + Material UI v5 + Vite
- **Maps:** Mapbox GL JS via react-map-gl

## Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- Mapbox access token ([get one free](https://account.mapbox.com/))

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp ../.env.example ../.env  # edit with your MAPBOX_ACCESS_TOKEN
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
# Set VITE_MAPBOX_TOKEN in .env or .env.local
npm run dev
```

### Environment Variables

See `.env.example` for all required variables.

## Architecture

```
POST /api/trip-plan/ -> route_service (Mapbox) -> hos_engine (HOS simulation) -> log_generator (daily logs)
```

The HOS engine implements 2020+ FMCSA rules for property-carrying drivers:
- 11-hour driving limit
- 14-hour window (doesn't pause for breaks)
- 30-minute break after 8h driving (any non-driving time qualifies)
- 70-hour/8-day cycle with 34-hour restart
- 10-hour off-duty between shifts
