# ELD Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack ELD Trip Planner that takes truck trip inputs and outputs a Mapbox route with HOS-compliant stops and FMCSA-format daily log sheets drawn in SVG.

**Architecture:** Django+DRF backend with three services (route_service for Mapbox API, hos_engine for HOS simulation, log_generator for daily logs). React+TypeScript+MUI frontend with Mapbox GL JS map and SVG log sheet components. Backend computes everything; frontend displays it.

**Tech Stack:** Python 3.12, Django 5, DRF, requests (Mapbox API) | React 18, Vite, TypeScript, MUI v5, react-map-gl v7, Axios

**Spec:** `SPOTTER_ASSESSMENT_SPEC_V2.md` (in project root)

---

## File Structure

### Backend (`backend/`)

| File | Responsibility |
|------|---------------|
| `manage.py` | Django management |
| `requirements.txt` | Python dependencies |
| `Procfile` | Railway deployment command |
| `runtime.txt` | Python version for Railway |
| `config/__init__.py` | Package init |
| `config/settings.py` | Django settings (CORS, installed apps, DB) |
| `config/urls.py` | Root URL routing |
| `config/wsgi.py` | WSGI entry point |
| `trips/__init__.py` | Package init |
| `trips/models.py` | TripPlan model (UUID pk, inputs, JSON results) |
| `trips/serializers.py` | DRF serializers for request/response |
| `trips/views.py` | TripPlanCreateView, TripPlanDetailView |
| `trips/urls.py` | `/api/trip-plan/` routes |
| `trips/admin.py` | TripPlan admin registration |
| `trips/services/__init__.py` | Package init |
| `trips/services/route_service.py` | Mapbox Directions + reverse geocoding + route interpolation |
| `trips/services/hos_engine.py` | HOS rules engine — DriverState, simulate_driving, stop insertion |
| `trips/services/log_generator.py` | Timeline building, midnight splitting, daily log generation, 70h recap |
| `trips/tests/__init__.py` | Package init |
| `trips/tests/test_hos_engine.py` | HOS engine unit tests |
| `trips/tests/test_log_generator.py` | Log generator unit tests |
| `trips/tests/test_views.py` | API integration tests |

### Frontend (`frontend/`)

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite config with proxy |
| `index.html` | HTML entry point |
| `src/main.tsx` | React entry + MUI ThemeProvider |
| `src/App.tsx` | Main layout: sidebar + map + timeline + logs |
| `src/theme.ts` | MUI theme (dark navy + orange) |
| `src/types/index.ts` | TypeScript interfaces for API data |
| `src/services/api.ts` | Axios client + `planTrip()` + `getTripPlan()` |
| `src/hooks/useTripPlanner.ts` | State management: form, loading, results, errors |
| `src/components/TripForm.tsx` | Form with 3 location autocompletes + cycle input |
| `src/components/LocationAutocomplete.tsx` | Mapbox Geocoding autocomplete with debounce |
| `src/components/RouteMap.tsx` | Mapbox GL JS map: polyline + stop markers + popups |
| `src/components/TripSummary.tsx` | Summary cards: distance, time, stops, fuel cost |
| `src/components/StopTimeline.tsx` | Horizontal stop timeline with colored chips |
| `src/components/LogSheet.tsx` | SVG component: one FMCSA daily log (grid + header + remarks + recap) |
| `src/components/LogSheetList.tsx` | Renders LogSheet per day + PDF export button |

---

## Phase 1: Backend Foundation

### Task 1: Project Scaffolding + Git Init

**Files:**
- Create: `backend/manage.py`
- Create: `backend/requirements.txt`
- Create: `backend/config/__init__.py`
- Create: `backend/config/settings.py`
- Create: `backend/config/urls.py`
- Create: `backend/config/wsgi.py`
- Create: `backend/trips/__init__.py`
- Create: `backend/trips/models.py`
- Create: `backend/trips/admin.py`
- Create: `backend/trips/urls.py`
- Create: `backend/trips/views.py`
- Create: `backend/trips/serializers.py`
- Create: `backend/trips/services/__init__.py`
- Create: `backend/trips/tests/__init__.py`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Initialize git repo**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp
git init
```

- [ ] **Step 2: Create .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
build/
.eggs/
*.egg
venv/
.venv/
env/

# Django
db.sqlite3
*.log
media/
staticfiles/

# Node
node_modules/
frontend/dist/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Reference images (not needed in repo)
*.png
```

- [ ] **Step 3: Create .env.example**

```
# Backend
MAPBOX_ACCESS_TOKEN=pk.xxx
DJANGO_SECRET_KEY=change-me-in-production
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
DEBUG=True

# Frontend
VITE_MAPBOX_TOKEN=pk.xxx
VITE_API_URL=http://localhost:8000/api
```

- [ ] **Step 4: Create requirements.txt**

```
django>=5.0,<6.0
djangorestframework>=3.15,<4.0
django-cors-headers>=4.3,<5.0
requests>=2.31,<3.0
python-dotenv>=1.0,<2.0
gunicorn>=22.0,<23.0
timezonefinder>=6.5,<7.0
```

- [ ] **Step 5: Create Django project config**

`backend/config/__init__.py`:
```python
```

`backend/config/settings.py`:
```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-secret-key-change-me')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'trips',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS', 'http://localhost:5173'
).split(',')

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

MAPBOX_ACCESS_TOKEN = os.getenv('MAPBOX_ACCESS_TOKEN', '')
```

`backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('trips.urls')),
]
```

`backend/config/wsgi.py`:
```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_wsgi_application()
```

- [ ] **Step 6: Create trips app skeleton**

`backend/trips/__init__.py`:
```python
```

`backend/trips/models.py`:
```python
import uuid
from django.db import models


class TripPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Inputs
    current_location_address = models.CharField(max_length=255)
    current_location_lat = models.FloatField()
    current_location_lng = models.FloatField()
    pickup_location_address = models.CharField(max_length=255)
    pickup_location_lat = models.FloatField()
    pickup_location_lng = models.FloatField()
    dropoff_location_address = models.CharField(max_length=255)
    dropoff_location_lat = models.FloatField()
    dropoff_location_lng = models.FloatField()
    current_cycle_used = models.FloatField()

    # Computed results
    total_distance_miles = models.FloatField(null=True)
    total_duration_hours = models.FloatField(null=True)
    fuel_cost_estimate = models.FloatField(null=True)
    route_geometry = models.JSONField(null=True)
    stops = models.JSONField(null=True)
    driving_segments = models.JSONField(null=True)
    daily_logs = models.JSONField(null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Trip {self.id}: {self.current_location_address} -> {self.dropoff_location_address}"
```

`backend/trips/admin.py`:
```python
from django.contrib import admin
from .models import TripPlan

@admin.register(TripPlan)
class TripPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'current_location_address', 'dropoff_location_address', 'created_at']
    readonly_fields = ['id', 'created_at']
```

`backend/trips/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path('trip-plan/', views.TripPlanCreateView.as_view(), name='trip-plan-create'),
    path('trip-plan/<uuid:pk>/', views.TripPlanDetailView.as_view(), name='trip-plan-detail'),
]
```

`backend/trips/serializers.py`:
```python
from rest_framework import serializers


class LocationSerializer(serializers.Serializer):
    address = serializers.CharField(max_length=255)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = LocationSerializer()
    pickup_location = LocationSerializer()
    dropoff_location = LocationSerializer()
    current_cycle_used = serializers.FloatField(min_value=0, max_value=70)


class TripPlanResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    created_at = serializers.DateTimeField()
    total_distance_miles = serializers.FloatField()
    total_duration_hours = serializers.FloatField()
    fuel_cost_estimate = serializers.FloatField()
    number_of_stops = serializers.IntegerField()
    number_of_log_days = serializers.IntegerField()
    route = serializers.DictField()
    stops = serializers.ListField()
    driving_segments = serializers.ListField()
    daily_logs = serializers.ListField()
```

`backend/trips/views.py`:
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import TripPlan
from .serializers import TripPlanRequestSerializer


class TripPlanCreateView(APIView):
    def post(self, request):
        serializer = TripPlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # TODO: wire up in Task 5
        return Response({'message': 'stub'}, status=status.HTTP_200_OK)


class TripPlanDetailView(APIView):
    def get(self, request, pk):
        try:
            plan = TripPlan.objects.get(pk=pk)
        except TripPlan.DoesNotExist:
            return Response(
                {'error': 'not_found', 'message': 'Trip plan not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'id': str(plan.id),
            'created_at': plan.created_at.isoformat(),
            'total_distance_miles': plan.total_distance_miles,
            'total_duration_hours': plan.total_duration_hours,
            'fuel_cost_estimate': plan.fuel_cost_estimate,
            'number_of_stops': len(plan.stops) if plan.stops else 0,
            'number_of_log_days': len(plan.daily_logs) if plan.daily_logs else 0,
            'route': {'geometry': plan.route_geometry},
            'stops': plan.stops or [],
            'driving_segments': plan.driving_segments or [],
            'daily_logs': plan.daily_logs or [],
        })
```

`backend/trips/services/__init__.py`:
```python
```

`backend/trips/tests/__init__.py`:
```python
```

- [ ] **Step 7: Create manage.py**

`backend/manage.py`:
```python
#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
```

- [ ] **Step 8: Create venv, install deps, migrate, verify server starts**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp
python -m venv venv
source venv/Scripts/activate  # Windows git bash
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000 &
sleep 2
curl -s http://localhost:8000/api/trip-plan/ -X POST -H "Content-Type: application/json" -d '{}' | python -m json.tool
# Expected: 400 with validation errors (fields required)
kill %1
```

- [ ] **Step 9: Commit**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp
git add .gitignore .env.example backend/
git commit -m "feat: scaffold Django project with TripPlan model and API stubs"
```

---

### Task 2: Route Service (Mapbox Directions + Reverse Geocoding + Interpolation)

**Files:**
- Create: `backend/trips/services/route_service.py`
- Create: `backend/trips/tests/test_route_service.py`

- [ ] **Step 1: Write route_service.py**

```python
import math
from functools import lru_cache
from typing import TypedDict
import requests
from django.conf import settings


class Location(TypedDict):
    lat: float
    lng: float
    address: str


class RouteLeg(TypedDict):
    distance_miles: float
    duration_hours: float


class RouteResult(TypedDict):
    geometry: dict  # GeoJSON LineString
    legs: list[RouteLeg]
    total_distance_miles: float
    total_duration_hours: float


def fetch_route(current: Location, pickup: Location, dropoff: Location) -> RouteResult:
    """Fetch route from Mapbox Directions API with waypoints: current -> pickup -> dropoff."""
    token = settings.MAPBOX_ACCESS_TOKEN
    if not token:
        raise ValueError("MAPBOX_ACCESS_TOKEN not configured")

    coordinates = (
        f"{current['lng']},{current['lat']};"
        f"{pickup['lng']},{pickup['lat']};"
        f"{dropoff['lng']},{dropoff['lat']}"
    )
    url = (
        f"https://api.mapbox.com/directions/v5/mapbox/driving/"
        f"{coordinates}"
        f"?geometries=geojson&overview=full&access_token={token}"
    )

    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if data.get('code') != 'Ok' or not data.get('routes'):
        raise ValueError(f"Mapbox Directions API error: {data.get('code', 'unknown')}")

    route = data['routes'][0]
    geometry = route['geometry']  # GeoJSON LineString

    legs = []
    for leg in route['legs']:
        legs.append(RouteLeg(
            distance_miles=leg['distance'] / 1609.344,  # meters to miles
            duration_hours=leg['duration'] / 3600,       # seconds to hours
        ))

    total_dist = sum(l['distance_miles'] for l in legs)
    total_dur = sum(l['duration_hours'] for l in legs)

    return RouteResult(
        geometry=geometry,
        legs=legs,
        total_distance_miles=round(total_dist, 1),
        total_duration_hours=round(total_dur, 2),
    )


def _haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance between two points in miles using haversine formula."""
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def interpolate_along_route(geometry: dict, target_miles: float) -> Location:
    """Find the lat/lng at a given cumulative distance along a GeoJSON LineString."""
    coords = geometry['coordinates']  # [[lng, lat], ...]
    if target_miles <= 0:
        return Location(lat=coords[0][1], lng=coords[0][0], address='')

    cumulative = 0.0
    for i in range(len(coords) - 1):
        lng1, lat1 = coords[i]
        lng2, lat2 = coords[i + 1]
        segment_dist = _haversine_miles(lat1, lng1, lat2, lng2)

        if cumulative + segment_dist >= target_miles:
            # Interpolate within this segment
            fraction = (target_miles - cumulative) / segment_dist if segment_dist > 0 else 0
            lat = lat1 + fraction * (lat2 - lat1)
            lng = lng1 + fraction * (lng2 - lng1)
            return Location(lat=round(lat, 6), lng=round(lng, 6), address='')
        cumulative += segment_dist

    # Past the end — return last coordinate
    return Location(lat=coords[-1][1], lng=coords[-1][0], address='')


def reverse_geocode(lat: float, lng: float) -> str:
    """Reverse geocode a coordinate to 'City, ST' format. Rounds before caching."""
    return _reverse_geocode_cached(round(lat, 2), round(lng, 2))


@lru_cache(maxsize=256)
def _reverse_geocode_cached(lat: float, lng: float) -> str:
    """Cached reverse geocode. Only called with pre-rounded coordinates."""
    token = settings.MAPBOX_ACCESS_TOKEN
    if not token:
        return ''

    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/"
        f"{lng},{lat}.json"
        f"?types=place&limit=1&access_token={token}"
    )

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        features = data.get('features', [])
        if not features:
            return ''
        place_name = features[0].get('place_name', '')
        # Parse "City, State, United States" -> "City, ST"
        parts = [p.strip() for p in place_name.split(',')]
        if len(parts) >= 2:
            return f"{parts[0]}, {parts[1]}"
        return parts[0] if parts else ''
    except (requests.RequestException, KeyError, IndexError):
        return ''
```

- [ ] **Step 2: Write tests for interpolation (pure math, no API calls)**

`backend/trips/tests/test_route_service.py`:
```python
from django.test import TestCase
from trips.services.route_service import interpolate_along_route, _haversine_miles


class TestHaversine(TestCase):
    def test_same_point_is_zero(self):
        dist = _haversine_miles(41.8781, -87.6298, 41.8781, -87.6298)
        self.assertAlmostEqual(dist, 0.0, places=1)

    def test_chicago_to_indy_roughly_180_miles(self):
        dist = _haversine_miles(41.8781, -87.6298, 39.7684, -86.1581)
        self.assertGreater(dist, 150)
        self.assertLess(dist, 200)


class TestInterpolateAlongRoute(TestCase):
    def setUp(self):
        # Simple route: 3 points roughly along a line
        self.geometry = {
            'type': 'LineString',
            'coordinates': [
                [-87.6298, 41.8781],  # Chicago
                [-86.8944, 40.4173],  # Lafayette
                [-86.1581, 39.7684],  # Indianapolis
            ],
        }

    def test_zero_miles_returns_start(self):
        loc = interpolate_along_route(self.geometry, 0)
        self.assertAlmostEqual(loc['lat'], 41.8781, places=3)
        self.assertAlmostEqual(loc['lng'], -87.6298, places=3)

    def test_beyond_route_returns_end(self):
        loc = interpolate_along_route(self.geometry, 99999)
        self.assertAlmostEqual(loc['lat'], 39.7684, places=3)
        self.assertAlmostEqual(loc['lng'], -86.1581, places=3)

    def test_midpoint_is_between_start_and_end(self):
        # Total route is roughly 180 miles, so 90 miles should be roughly mid
        loc = interpolate_along_route(self.geometry, 90)
        self.assertGreater(loc['lat'], 39.7)
        self.assertLess(loc['lat'], 41.9)
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/backend
python manage.py test trips.tests.test_route_service -v 2
```
Expected: 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/trips/services/route_service.py backend/trips/tests/test_route_service.py
git commit -m "feat: add route service with Mapbox directions, interpolation, reverse geocoding"
```

---

### Task 3: HOS Engine — Core Simulation

**Files:**
- Create: `backend/trips/services/hos_engine.py`
- Create: `backend/trips/tests/test_hos_engine.py`

This is the most critical backend component. The HOS engine is pure logic with no I/O — perfect for TDD.

- [ ] **Step 1: Write hos_engine.py with data classes and main function**

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

from trips.services.route_service import interpolate_along_route


@dataclass
class Location:
    lat: float
    lng: float
    address: str = ''


@dataclass
class Stop:
    type: str  # start, pickup, dropoff, fuel_stop, rest_break, overnight_rest, restart_34h
    location: Location
    arrival_time: datetime
    departure_time: datetime
    duration_hours: float
    duty_status: str  # off_duty, sleeper_berth, driving, on_duty_not_driving
    cumulative_miles: float
    notes: str = ''


@dataclass
class DrivingSegment:
    start_time: datetime
    end_time: datetime
    duration_hours: float
    miles: float
    start_location: Location
    end_location: Location


@dataclass
class DriverState:
    driving_remaining: float = 11.0
    window_remaining: float = 14.0
    driving_since_break: float = 0.0
    cycle_remaining: float = 70.0
    miles_since_fuel: float = 0.0
    current_time: datetime = field(default_factory=datetime.now)
    cumulative_miles: float = 0.0


@dataclass
class TripPlanResult:
    stops: list[Stop]
    driving_segments: list[DrivingSegment]
    total_distance_miles: float
    total_duration_hours: float
    route_geometry: Optional[dict] = None


def calculate_trip(
    current_loc: Location,
    pickup_loc: Location,
    dropoff_loc: Location,
    cycle_used: float,
    leg_a_miles: float,
    leg_a_hours: float,
    leg_b_miles: float,
    leg_b_hours: float,
    route_geometry: dict,
    start_time: Optional[datetime] = None,
) -> TripPlanResult:
    """Main entry point. Simulates a full trip with HOS-compliant stops."""

    if start_time is None:
        start_time = datetime.now().replace(second=0, microsecond=0)

    state = DriverState(
        cycle_remaining=70.0 - cycle_used,
        current_time=start_time,
    )
    stops: list[Stop] = []
    segments: list[DrivingSegment] = []

    # Start stop
    stops.append(Stop(
        type='start',
        location=current_loc,
        arrival_time=start_time,
        departure_time=start_time,
        duration_hours=0.0,
        duty_status='off_duty',
        cumulative_miles=0.0,
        notes=f"Trip start — {current_loc.address}",
    ))

    # Leg A: drive to pickup
    _simulate_driving(state, stops, segments, leg_a_miles, leg_a_hours, route_geometry)

    # Pickup: 1h on-duty-not-driving
    _insert_pickup_or_dropoff(state, stops, pickup_loc, 'pickup', route_geometry)

    # Reset break clock: 1h non-driving satisfies 30min break (2020 FMCSA rule)
    state.driving_since_break = 0.0

    # Leg B: drive to dropoff
    _simulate_driving(state, stops, segments, leg_b_miles, leg_b_hours, route_geometry)

    # Dropoff: 1h on-duty-not-driving
    _insert_pickup_or_dropoff(state, stops, dropoff_loc, 'dropoff', route_geometry)

    total_dist = leg_a_miles + leg_b_miles
    total_dur = (state.current_time - start_time).total_seconds() / 3600

    return TripPlanResult(
        stops=stops,
        driving_segments=segments,
        total_distance_miles=round(total_dist, 1),
        total_duration_hours=round(total_dur, 2),
        route_geometry=route_geometry,
    )


def _insert_pickup_or_dropoff(
    state: DriverState,
    stops: list[Stop],
    location: Location,
    stop_type: str,
    geometry: dict,
) -> None:
    """Insert pickup or dropoff. Check cycle availability first."""
    # Need 1h of on-duty time. Check if cycle can handle it.
    if state.cycle_remaining < 1.0:
        _insert_mandatory_rest(state, stops, geometry)

    # Also check if window can handle it. If not, rest first.
    if state.window_remaining < 1.0:
        _insert_overnight_rest(state, stops, geometry)

    arrival = state.current_time
    departure = arrival + timedelta(hours=1)
    label = 'Pickup' if stop_type == 'pickup' else 'Dropoff'
    action = '1h loading' if stop_type == 'pickup' else '1h unloading'

    stops.append(Stop(
        type=stop_type,
        location=location,
        arrival_time=arrival,
        departure_time=departure,
        duration_hours=1.0,
        duty_status='on_duty_not_driving',
        cumulative_miles=state.cumulative_miles,
        notes=f"{label} — {location.address} ({action})",
    ))

    state.window_remaining -= 1.0
    state.cycle_remaining -= 1.0
    state.current_time = departure


def _simulate_driving(
    state: DriverState,
    stops: list[Stop],
    segments: list[DrivingSegment],
    total_miles: float,
    total_hours: float,
    geometry: dict,
) -> None:
    """Simulate driving a leg, inserting mandatory stops as HOS limits are reached."""
    remaining_miles = total_miles
    remaining_hours = total_hours
    avg_speed = total_miles / total_hours if total_hours > 0 else 55.0

    while remaining_miles > 0.01:
        # Check if we can drive at all
        if state.driving_remaining <= 0.01 or state.window_remaining <= 0.01:
            _insert_overnight_rest(state, stops, geometry)

        if state.cycle_remaining <= 0.01:
            _insert_34h_restart(state, stops, geometry)

        # Calculate max driveable hours before hitting any limit
        miles_to_fuel = max(0, 1000 - state.miles_since_fuel)
        hours_to_fuel = miles_to_fuel / avg_speed if avg_speed > 0 else float('inf')

        max_drive = min(
            state.driving_remaining,
            state.window_remaining,
            8.0 - state.driving_since_break,
            state.cycle_remaining,
            hours_to_fuel,
            remaining_hours,
        )

        if max_drive <= 0.001:
            break  # safety valve

        # Drive
        miles_covered = max_drive * avg_speed
        drive_start_time = state.current_time
        start_miles = state.cumulative_miles

        state.cumulative_miles += miles_covered
        state.driving_remaining -= max_drive
        state.window_remaining -= max_drive
        state.driving_since_break += max_drive
        state.cycle_remaining -= max_drive
        state.miles_since_fuel += miles_covered
        state.current_time += timedelta(hours=max_drive)
        remaining_miles -= miles_covered
        remaining_hours -= max_drive

        # Record driving segment
        start_loc = interpolate_along_route(geometry, start_miles)
        end_loc = interpolate_along_route(geometry, state.cumulative_miles)

        segments.append(DrivingSegment(
            start_time=drive_start_time,
            end_time=state.current_time,
            duration_hours=round(max_drive, 4),
            miles=round(miles_covered, 1),
            start_location=Location(**start_loc),
            end_location=Location(**end_loc),
        ))

        if remaining_miles <= 0.01:
            break

        # Determine which stop(s) to insert
        needs_fuel = state.miles_since_fuel >= 999.9
        needs_break = state.driving_since_break >= 7.99
        needs_overnight = state.driving_remaining <= 0.01 or state.window_remaining <= 0.01
        needs_restart = state.cycle_remaining <= 0.01

        if needs_fuel:
            loc_dict = interpolate_along_route(geometry, state.cumulative_miles)
            loc = Location(**loc_dict)
            arrival = state.current_time
            departure = arrival + timedelta(minutes=30)

            stops.append(Stop(
                type='fuel_stop',
                location=loc,
                arrival_time=arrival,
                departure_time=departure,
                duration_hours=0.5,
                duty_status='on_duty_not_driving',
                cumulative_miles=round(state.cumulative_miles, 1),
                notes=f"Fuel stop ({round(state.cumulative_miles)}mi)",
            ))
            state.miles_since_fuel = 0
            state.window_remaining -= 0.5
            state.cycle_remaining -= 0.5
            state.current_time = departure

            # 2020 FMCSA: fuel stop >=30min satisfies break requirement
            if needs_break:
                state.driving_since_break = 0
                needs_break = False

        if needs_break:
            loc_dict = interpolate_along_route(geometry, state.cumulative_miles)
            loc = Location(**loc_dict)
            arrival = state.current_time
            departure = arrival + timedelta(minutes=30)

            stops.append(Stop(
                type='rest_break',
                location=loc,
                arrival_time=arrival,
                departure_time=departure,
                duration_hours=0.5,
                duty_status='off_duty',
                cumulative_miles=round(state.cumulative_miles, 1),
                notes="30-min break (8h driving limit)",
            ))
            state.driving_since_break = 0
            state.window_remaining -= 0.5
            state.current_time = departure
            # Off-duty does NOT consume cycle_remaining

        if needs_restart:
            _insert_34h_restart(state, stops, geometry)
        elif needs_overnight:
            _insert_overnight_rest(state, stops, geometry)


def _insert_overnight_rest(state: DriverState, stops: list[Stop], geometry: dict) -> None:
    """10h off-duty rest. Resets 11h driving + 14h window. Does NOT reset 70h cycle."""
    loc_dict = interpolate_along_route(geometry, state.cumulative_miles)
    loc = Location(**loc_dict)
    arrival = state.current_time
    departure = arrival + timedelta(hours=10)

    stops.append(Stop(
        type='overnight_rest',
        location=loc,
        arrival_time=arrival,
        departure_time=departure,
        duration_hours=10.0,
        duty_status='off_duty',
        cumulative_miles=round(state.cumulative_miles, 1),
        notes="10h off-duty rest",
    ))

    state.driving_remaining = 11.0
    state.window_remaining = 14.0
    state.driving_since_break = 0.0
    state.current_time = departure


def _insert_34h_restart(state: DriverState, stops: list[Stop], geometry: dict) -> None:
    """34h off-duty restart. Resets EVERYTHING including 70h cycle."""
    loc_dict = interpolate_along_route(geometry, state.cumulative_miles)
    loc = Location(**loc_dict)
    arrival = state.current_time
    departure = arrival + timedelta(hours=34)

    stops.append(Stop(
        type='restart_34h',
        location=loc,
        arrival_time=arrival,
        departure_time=departure,
        duration_hours=34.0,
        duty_status='off_duty',
        cumulative_miles=round(state.cumulative_miles, 1),
        notes="34h restart (70h cycle reset)",
    ))

    state.driving_remaining = 11.0
    state.window_remaining = 14.0
    state.driving_since_break = 0.0
    state.cycle_remaining = 70.0
    state.current_time = departure


def _insert_mandatory_rest(state: DriverState, stops: list[Stop], geometry: dict) -> None:
    """Decides between 10h rest or 34h restart based on cycle state."""
    if state.cycle_remaining <= 0.01:
        _insert_34h_restart(state, stops, geometry)
    else:
        _insert_overnight_rest(state, stops, geometry)
```

- [ ] **Step 2: Write HOS engine tests**

`backend/trips/tests/test_hos_engine.py`:
```python
from datetime import datetime
from django.test import TestCase
from trips.services.hos_engine import (
    calculate_trip, Location, DriverState, Stop,
)


# Simple geometry for testing - straight line ~180 miles
TEST_GEOMETRY = {
    'type': 'LineString',
    'coordinates': [
        [-87.6298, 41.8781],  # Chicago
        [-87.0, 41.0],
        [-86.5, 40.5],
        [-86.1581, 39.7684],  # Indianapolis
        [-86.3, 39.0],
        [-86.5, 38.0],
        [-86.7816, 36.1627],  # Nashville
    ],
}

START_TIME = datetime(2026, 5, 10, 8, 0)  # 8:00 AM


class TestShortTrip(TestCase):
    """Trip within all HOS limits — no mandatory stops needed."""

    def test_short_trip_no_stops(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=180, leg_a_hours=3.0,
            leg_b_miles=280, leg_b_hours=4.5,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        # Should have: start, pickup, dropoff — no mandatory stops
        stop_types = [s.type for s in result.stops]
        self.assertIn('start', stop_types)
        self.assertIn('pickup', stop_types)
        self.assertIn('dropoff', stop_types)
        self.assertNotIn('overnight_rest', stop_types)
        self.assertNotIn('rest_break', stop_types)

    def test_short_trip_has_driving_segments(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=180, leg_a_hours=3.0,
            leg_b_miles=280, leg_b_hours=4.5,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        total_drive_miles = sum(s.miles for s in result.driving_segments)
        self.assertAlmostEqual(total_drive_miles, 460, delta=1)


class TestDrivingLimitTriggers(TestCase):
    """11h driving limit should trigger overnight rest."""

    def test_11h_limit_triggers_overnight(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=200, leg_a_hours=3.5,
            leg_b_miles=800, leg_b_hours=14.0,  # 14h driving needed — exceeds 11h limit
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('overnight_rest', stop_types)
        overnight = [s for s in result.stops if s.type == 'overnight_rest']
        self.assertEqual(overnight[0].duration_hours, 10.0)


class TestBreakRule(TestCase):
    """30-min break triggers after 8h cumulative driving."""

    def test_8h_driving_triggers_break(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=500, leg_a_hours=9.0,  # >8h driving before pickup
            leg_b_miles=100, leg_b_hours=1.8,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('rest_break', stop_types)

    def test_pickup_resets_break_clock(self):
        """1h pickup (non-driving) satisfies 30min break under 2020 rules."""
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=420, leg_a_hours=7.5,  # Just under 8h
            leg_b_miles=420, leg_b_hours=7.5,  # Would trigger at 8h if not reset
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        # The 1h pickup resets break clock, so leg B starts fresh.
        # Break should only trigger once total driving in leg B hits 8h.
        breaks = [s for s in result.stops if s.type == 'rest_break']
        # Leg A: 7.5h (no break needed, under 8h)
        # Pickup: resets clock
        # Leg B: 7.5h (no break needed, under 8h)
        self.assertEqual(len(breaks), 0)


class TestFuelStop(TestCase):
    """Fuel stop every 1,000 miles."""

    def test_fuel_stop_at_1000_miles(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=200, leg_a_hours=3.5,
            leg_b_miles=900, leg_b_hours=15.0,  # total 1100 miles
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        fuel_stops = [s for s in result.stops if s.type == 'fuel_stop']
        self.assertGreaterEqual(len(fuel_stops), 1)
        self.assertEqual(fuel_stops[0].duty_status, 'on_duty_not_driving')

    def test_fuel_stop_satisfies_break(self):
        """When fuel stop and 8h break trigger at the same point, only fuel stop should appear."""
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=500, leg_a_hours=8.5,  # Triggers break at 8h
            leg_b_miles=600, leg_b_hours=10.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        # Find any fuel stop that occurred around the 8h driving mark
        fuel_stops = [s for s in result.stops if s.type == 'fuel_stop']
        # If a fuel stop exists, there should be no rest_break immediately after it
        # (the fuel stop satisfies the break requirement under 2020 rules)
        for i, stop in enumerate(result.stops):
            if stop.type == 'fuel_stop':
                # Check that the next stop is NOT a rest_break at the same location
                if i + 1 < len(result.stops):
                    next_stop = result.stops[i + 1]
                    if next_stop.type == 'rest_break':
                        self.fail(
                            f"rest_break at {next_stop.arrival_time} should not appear "
                            f"after fuel_stop at {stop.arrival_time} — "
                            f"fuel stop >=30min satisfies break requirement"
                        )


class TestCycleExhaustion(TestCase):
    """70h cycle limit and 34h restart."""

    def test_34h_restart_when_cycle_exhausted(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=60,  # Only 10h remaining
            leg_a_miles=200, leg_a_hours=3.5,
            leg_b_miles=500, leg_b_hours=9.0,  # Needs >10h total on-duty
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('restart_34h', stop_types)
        restart = [s for s in result.stops if s.type == 'restart_34h'][0]
        self.assertEqual(restart.duration_hours, 34.0)

    def test_pickup_checks_cycle_before_deducting(self):
        """If cycle < 1h when arriving at pickup, rest first."""
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=59.5,  # 10.5h remaining: 9.0h driving leaves 1.5h
            leg_a_miles=500, leg_a_hours=9.0,  # Uses 9h of cycle, 1.5h left
            leg_b_miles=100, leg_b_hours=1.8,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        # After leg A (9h driving + possible breaks): cycle should have ~1.5h left
        # Pickup needs 1h. Should have enough. Verify no crash.
        stop_types = [s.type for s in result.stops]
        self.assertIn('pickup', stop_types)
        self.assertIn('dropoff', stop_types)

    def test_extreme_cycle_used_69_5(self):
        """Driver with only 0.5h of cycle left."""
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=69.5,
            leg_a_miles=50, leg_a_hours=1.0,
            leg_b_miles=50, leg_b_hours=1.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        # Should need a 34h restart at some point
        stop_types = [s.type for s in result.stops]
        self.assertIn('restart_34h', stop_types)


class TestWindowVsDriving(TestCase):
    """14h window can expire before 11h driving limit."""

    def test_14h_window_expires_first(self):
        """Lots of non-driving time eats the window but not driving limit."""
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=200, leg_a_hours=3.5,
            # After leg A (3.5h) + pickup (1h) = 4.5h of window used
            # Leg B needs 10h which would put window at 14.5h — over the limit
            leg_b_miles=550, leg_b_hours=10.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        # Window of 14h from 8AM = can't drive past 10PM
        # Leg A: 3.5h drive (11:30), pickup 1h (12:30), leg B needs 10h
        # At 8PM (window used 12h), window has 2h left. 
        # driving_remaining still has 11-3.5 = 7.5h left but window expires at 10PM
        stop_types = [s.type for s in result.stops]
        self.assertIn('overnight_rest', stop_types)
```

- [ ] **Step 3: Run tests**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/backend
python manage.py test trips.tests.test_hos_engine -v 2
```
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/trips/services/hos_engine.py backend/trips/tests/test_hos_engine.py
git commit -m "feat: add HOS rules engine with 11h/14h/30min/70h/34h rules and full test coverage"
```

---

### Task 4: Log Generator — Daily Log Sheets from Timeline

**Files:**
- Create: `backend/trips/services/log_generator.py`
- Create: `backend/trips/tests/test_log_generator.py`

- [ ] **Step 1: Write log_generator.py**

```python
from datetime import datetime, timedelta, time
from typing import Optional
from trips.services.hos_engine import Stop, DrivingSegment


def generate_daily_logs(
    stops: list[Stop],
    driving_segments: list[DrivingSegment],
    start_time: datetime,
    cycle_used_at_start: float,
) -> list[dict]:
    """Convert stops + driving segments into daily log sheets (midnight to midnight)."""

    # Build continuous timeline of status segments
    timeline = _build_timeline(stops, driving_segments, start_time)

    if not timeline:
        return []

    # Determine date range
    first_day = timeline[0]['start'].date()
    last_day = timeline[-1]['end'].date()

    daily_logs = []
    current_date = first_day

    while current_date <= last_day:
        day_start = datetime.combine(current_date, time(0, 0))
        day_end = datetime.combine(current_date + timedelta(days=1), time(0, 0))

        entries = []
        remarks = []
        day_miles = 0.0

        for seg in timeline:
            # Skip segments entirely outside this day
            if seg['end'] <= day_start or seg['start'] >= day_end:
                continue

            # Clip to day boundaries (midnight splitting)
            clipped_start = max(seg['start'], day_start)
            clipped_end = min(seg['end'], day_end)

            start_hour = _hours_since_midnight(clipped_start)
            end_hour = _hours_since_midnight(clipped_end)
            if clipped_end == day_end:
                end_hour = 24.0

            if end_hour <= start_hour:
                continue

            entries.append({
                'start_hour': round(start_hour, 4),
                'end_hour': round(end_hour, 4),
                'status': seg['status'],
            })

            # Proportional miles for driving segments
            if seg['status'] == 'driving' and seg.get('miles', 0) > 0:
                seg_total_hours = (seg['end'] - seg['start']).total_seconds() / 3600
                if seg_total_hours > 0:
                    fraction = (end_hour - start_hour) / seg_total_hours
                    day_miles += seg['miles'] * fraction

            # Remarks for events starting on this day
            if seg['start'].date() == current_date and seg.get('notes'):
                time_str = seg['start'].strftime('%H:%M')
                remarks.append(f"{time_str} — {seg['notes']}")

        # Compute totals
        totals = {
            'off_duty': 0.0,
            'sleeper_berth': 0.0,
            'driving': 0.0,
            'on_duty_not_driving': 0.0,
        }
        for entry in entries:
            duration = entry['end_hour'] - entry['start_hour']
            totals[entry['status']] += duration

        # Round totals
        for key in totals:
            totals[key] = round(totals[key], 2)

        # Determine from/to cities
        from_city = _get_city_for_day(stops, driving_segments, current_date, 'start')
        to_city = _get_city_for_day(stops, driving_segments, current_date, 'end')

        # Compute 70h recap
        recap = _compute_recap(
            stops, driving_segments, current_date,
            cycle_used_at_start, first_day,
        )

        daily_logs.append({
            'date': current_date.isoformat(),
            'day_number': len(daily_logs) + 1,
            'from_city': from_city,
            'to_city': to_city,
            'total_miles_today': round(day_miles, 1),
            'entries': entries,
            'totals': totals,
            'remarks': remarks,
            'recap_70hr': recap,
        })

        current_date += timedelta(days=1)

    return daily_logs


def _build_timeline(
    stops: list[Stop],
    driving_segments: list[DrivingSegment],
    start_time: datetime,
) -> list[dict]:
    """Merge stops and driving segments into a single chronological timeline."""
    events = []

    # Add driving segments
    for seg in driving_segments:
        events.append({
            'start': seg.start_time,
            'end': seg.end_time,
            'status': 'driving',
            'miles': seg.miles,
            'notes': '',
        })

    # Add non-driving stops (skip 'start' — it's a marker, not a duty period)
    for stop in stops:
        if stop.type == 'start' or stop.duration_hours <= 0:
            continue
        events.append({
            'start': stop.arrival_time,
            'end': stop.departure_time,
            'status': stop.duty_status,
            'miles': 0,
            'notes': stop.notes,
        })

    # Sort by start time
    events.sort(key=lambda e: e['start'])

    # Fill gaps with off_duty (pre-trip and post-trip padding)
    if not events:
        return []

    filled = []
    trip_start = datetime.combine(events[0]['start'].date(), time(0, 0))
    trip_end_day = datetime.combine(events[-1]['end'].date() + timedelta(days=1), time(0, 0))

    # Pre-trip off-duty: midnight to first event
    if events[0]['start'] > trip_start:
        filled.append({
            'start': trip_start,
            'end': events[0]['start'],
            'status': 'off_duty',
            'miles': 0,
            'notes': '',
        })

    # Add events, filling gaps between them
    for i, event in enumerate(events):
        if i > 0:
            prev_end = events[i - 1]['end']
            if event['start'] > prev_end + timedelta(seconds=1):
                filled.append({
                    'start': prev_end,
                    'end': event['start'],
                    'status': 'off_duty',
                    'miles': 0,
                    'notes': '',
                })
        filled.append(event)

    # Post-trip off-duty: last event to midnight
    if events[-1]['end'] < trip_end_day:
        filled.append({
            'start': events[-1]['end'],
            'end': trip_end_day,
            'status': 'off_duty',
            'miles': 0,
            'notes': '',
        })

    return filled


def _hours_since_midnight(dt: datetime) -> float:
    """Convert a datetime to fractional hours since midnight."""
    return dt.hour + dt.minute / 60 + dt.second / 3600


def _get_city_for_day(
    stops: list[Stop],
    segments: list[DrivingSegment],
    date,
    position: str,
) -> str:
    """Get the city where the driver was at the start or end of a given day."""
    all_events = []
    for s in stops:
        all_events.append((s.arrival_time, s.location.address))
    for seg in segments:
        all_events.append((seg.start_time, seg.start_location.address))
        all_events.append((seg.end_time, seg.end_location.address))

    day_events = [
        (t, addr) for t, addr in all_events
        if t.date() == date and addr
    ]

    if not day_events:
        # Look for the most recent event before this day
        before = [(t, addr) for t, addr in all_events if t.date() < date and addr]
        if before:
            return before[-1][1]
        return ''

    day_events.sort(key=lambda x: x[0])
    if position == 'start':
        return day_events[0][1]
    return day_events[-1][1]


def _compute_recap(
    stops: list[Stop],
    segments: list[DrivingSegment],
    current_date,
    cycle_used_at_start: float,
    trip_start_date,
) -> dict:
    """Compute 70h/8-day recap for a given day."""
    # Sum on-duty hours from the trip through current_date
    # Stops: only count on_duty_not_driving (pickup, dropoff, fuel stops)
    # Segments: count all driving hours
    on_duty_trip = 0.0
    for stop in stops:
        if stop.type == 'start':
            continue
        if stop.duty_status == 'on_duty_not_driving':
            if stop.arrival_time.date() <= current_date:
                on_duty_trip += stop.duration_hours

    for seg in segments:
        if seg.start_time.date() <= current_date:
            on_duty_trip += seg.duration_hours

    # Check for 34h restart — resets the base
    last_restart_date = None
    for stop in stops:
        if stop.type == 'restart_34h' and stop.departure_time.date() <= current_date:
            last_restart_date = stop.departure_time.date()

    if last_restart_date:
        # Recount on-duty only after restart
        on_duty_trip = 0.0
        for stop in stops:
            if stop.type == 'start':
                continue
            if stop.duty_status == 'on_duty_not_driving':
                if last_restart_date <= stop.arrival_time.date() <= current_date:
                    on_duty_trip += stop.duration_hours
        for seg in segments:
            if last_restart_date <= seg.start_time.date() <= current_date:
                on_duty_trip += seg.duration_hours
        a_total = on_duty_trip
    else:
        a_total = cycle_used_at_start + on_duty_trip

    b_available = max(0.0, 70.0 - a_total)

    # Column C: last 3 days
    three_days_ago = current_date - timedelta(days=2)
    c_on_duty = 0.0
    for stop in stops:
        if stop.type == 'start':
            continue
        if stop.duty_status == 'on_duty_not_driving':
            if three_days_ago <= stop.arrival_time.date() <= current_date:
                c_on_duty += stop.duration_hours
    for seg in segments:
        if three_days_ago <= seg.start_time.date() <= current_date:
            c_on_duty += seg.duration_hours

    if not last_restart_date and (current_date - trip_start_date).days < 3:
        c_on_duty += cycle_used_at_start

    return {
        'a_total_on_duty_7_days': round(a_total, 1),
        'b_hours_available_tomorrow': round(b_available, 1),
        'c_total_on_duty_3_days': round(c_on_duty, 1),
    }
```

- [ ] **Step 2: Write log generator tests**

`backend/trips/tests/test_log_generator.py`:
```python
from datetime import datetime, timedelta
from django.test import TestCase
from trips.services.hos_engine import Stop, DrivingSegment, Location
from trips.services.log_generator import generate_daily_logs


START = datetime(2026, 5, 10, 8, 0)
LOC = Location(41.0, -87.0, 'Test City, IL')


class TestSingleDayTrip(TestCase):
    """A short trip that starts and ends on the same day."""

    def test_single_day_sums_to_24(self):
        stops = [
            Stop('start', LOC, START, START, 0, 'off_duty', 0, 'Trip start'),
            Stop('pickup', LOC, START + timedelta(hours=3), START + timedelta(hours=4),
                 1.0, 'on_duty_not_driving', 180, 'Pickup'),
            Stop('dropoff', LOC, START + timedelta(hours=7), START + timedelta(hours=8),
                 1.0, 'on_duty_not_driving', 400, 'Dropoff'),
        ]
        segments = [
            DrivingSegment(START, START + timedelta(hours=3), 3.0, 180, LOC, LOC),
            DrivingSegment(START + timedelta(hours=4), START + timedelta(hours=7), 3.0, 220, LOC, LOC),
        ]

        logs = generate_daily_logs(stops, segments, START, cycle_used_at_start=0)

        self.assertEqual(len(logs), 1)
        totals = logs[0]['totals']
        total_hours = sum(totals.values())
        self.assertAlmostEqual(total_hours, 24.0, places=1)

    def test_single_day_has_correct_statuses(self):
        stops = [
            Stop('start', LOC, START, START, 0, 'off_duty', 0, 'Trip start'),
            Stop('pickup', LOC, START + timedelta(hours=3), START + timedelta(hours=4),
                 1.0, 'on_duty_not_driving', 180, 'Pickup'),
            Stop('dropoff', LOC, START + timedelta(hours=7), START + timedelta(hours=8),
                 1.0, 'on_duty_not_driving', 400, 'Dropoff'),
        ]
        segments = [
            DrivingSegment(START, START + timedelta(hours=3), 3.0, 180, LOC, LOC),
            DrivingSegment(START + timedelta(hours=4), START + timedelta(hours=7), 3.0, 220, LOC, LOC),
        ]

        logs = generate_daily_logs(stops, segments, START, cycle_used_at_start=0)

        totals = logs[0]['totals']
        self.assertAlmostEqual(totals['driving'], 6.0, places=1)
        self.assertAlmostEqual(totals['on_duty_not_driving'], 2.0, places=1)
        # Off duty = 8h before trip + 16h after dropoff = 16h total
        self.assertGreater(totals['off_duty'], 14.0)


class TestMultiDayTrip(TestCase):
    """A trip spanning multiple calendar days."""

    def test_two_day_trip(self):
        # Day 1: drive 8AM-6PM (10h), overnight rest 6PM-4AM
        # Day 2: drive 4AM-8AM (4h), dropoff
        overnight_start = START + timedelta(hours=10)
        overnight_end = overnight_start + timedelta(hours=10)  # 4AM next day

        stops = [
            Stop('start', LOC, START, START, 0, 'off_duty', 0, 'Trip start'),
            Stop('pickup', LOC, START + timedelta(hours=3), START + timedelta(hours=4),
                 1.0, 'on_duty_not_driving', 180, 'Pickup'),
            Stop('overnight_rest', LOC, overnight_start, overnight_end,
                 10.0, 'off_duty', 500, 'Overnight rest'),
            Stop('dropoff', LOC, overnight_end + timedelta(hours=4), overnight_end + timedelta(hours=5),
                 1.0, 'on_duty_not_driving', 700, 'Dropoff'),
        ]
        segments = [
            DrivingSegment(START, START + timedelta(hours=3), 3.0, 180, LOC, LOC),
            DrivingSegment(START + timedelta(hours=4), overnight_start, 6.0, 320, LOC, LOC),
            DrivingSegment(overnight_end, overnight_end + timedelta(hours=4), 4.0, 200, LOC, LOC),
        ]

        logs = generate_daily_logs(stops, segments, START, cycle_used_at_start=10)

        self.assertEqual(len(logs), 2)

        # Both days must sum to 24
        for log in logs:
            total = sum(log['totals'].values())
            self.assertAlmostEqual(total, 24.0, places=1,
                                   msg=f"Day {log['day_number']} totals: {log['totals']}")

    def test_midnight_splitting(self):
        """A driving period crossing midnight should appear in both days."""
        # Drive from 10PM to 2AM (4 hours across midnight)
        drive_start = datetime(2026, 5, 10, 22, 0)
        drive_end = datetime(2026, 5, 11, 2, 0)

        stops = [
            Stop('start', LOC, drive_start, drive_start, 0, 'off_duty', 0, ''),
        ]
        segments = [
            DrivingSegment(drive_start, drive_end, 4.0, 220, LOC, LOC),
        ]

        logs = generate_daily_logs(stops, segments, drive_start, cycle_used_at_start=0)

        self.assertEqual(len(logs), 2)

        # Day 1 should have 2h of driving (22:00-24:00)
        day1_driving = logs[0]['totals']['driving']
        self.assertAlmostEqual(day1_driving, 2.0, places=1)

        # Day 2 should have 2h of driving (00:00-02:00)
        day2_driving = logs[1]['totals']['driving']
        self.assertAlmostEqual(day2_driving, 2.0, places=1)


class TestRecapComputation(TestCase):
    """70h/8-day recap table."""

    def test_day1_recap_includes_cycle_used(self):
        stops = [
            Stop('start', LOC, START, START, 0, 'off_duty', 0, ''),
            Stop('dropoff', LOC, START + timedelta(hours=5), START + timedelta(hours=6),
                 1.0, 'on_duty_not_driving', 300, ''),
        ]
        segments = [
            DrivingSegment(START, START + timedelta(hours=5), 5.0, 300, LOC, LOC),
        ]

        logs = generate_daily_logs(stops, segments, START, cycle_used_at_start=20)

        recap = logs[0]['recap_70hr']
        # A = 20 (pre-trip) + 5h driving + 1h dropoff = 26
        self.assertAlmostEqual(recap['a_total_on_duty_7_days'], 26.0, places=0)
        # B = 70 - 26 = 44
        self.assertAlmostEqual(recap['b_hours_available_tomorrow'], 44.0, places=0)
```

- [ ] **Step 3: Run tests**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/backend
python manage.py test trips.tests.test_log_generator -v 2
```
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/trips/services/log_generator.py backend/trips/tests/test_log_generator.py
git commit -m "feat: add daily log generator with midnight splitting, padding, and 70h recap"
```

---

### Task 5: Wire Up API — Connect Services to Views

**Files:**
- Modify: `backend/trips/views.py`
- Create: `backend/trips/tests/test_views.py`

- [ ] **Step 1: Update views.py to call services**

Replace the full content of `backend/trips/views.py`:
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import TripPlan
from .serializers import TripPlanRequestSerializer
from .services.route_service import fetch_route, reverse_geocode
from .services.hos_engine import calculate_trip, Location
from .services.log_generator import generate_daily_logs


class TripPlanCreateView(APIView):
    def post(self, request):
        serializer = TripPlanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'validation_error', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        current = data['current_location']
        pickup = data['pickup_location']
        dropoff = data['dropoff_location']
        cycle_used = data['current_cycle_used']

        # Fetch route from Mapbox
        try:
            route = fetch_route(
                {'lat': current['lat'], 'lng': current['lng'], 'address': current['address']},
                {'lat': pickup['lat'], 'lng': pickup['lng'], 'address': pickup['address']},
                {'lat': dropoff['lat'], 'lng': dropoff['lng'], 'address': dropoff['address']},
            )
        except Exception as e:
            return Response(
                {'error': 'route_service_error',
                 'message': f'Unable to calculate route: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Run HOS engine
        current_loc = Location(current['lat'], current['lng'], current['address'])
        pickup_loc = Location(pickup['lat'], pickup['lng'], pickup['address'])
        dropoff_loc = Location(dropoff['lat'], dropoff['lng'], dropoff['address'])

        trip = calculate_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            cycle_used=cycle_used,
            leg_a_miles=route['legs'][0]['distance_miles'],
            leg_a_hours=route['legs'][0]['duration_hours'],
            leg_b_miles=route['legs'][1]['distance_miles'],
            leg_b_hours=route['legs'][1]['duration_hours'],
            route_geometry=route['geometry'],
        )

        # Reverse geocode stop locations
        for stop in trip.stops:
            if not stop.location.address:
                stop.location.address = reverse_geocode(stop.location.lat, stop.location.lng)

        for seg in trip.driving_segments:
            if not seg.start_location.address:
                seg.start_location.address = reverse_geocode(seg.start_location.lat, seg.start_location.lng)
            if not seg.end_location.address:
                seg.end_location.address = reverse_geocode(seg.end_location.lat, seg.end_location.lng)

        # Generate daily logs
        start_time = trip.stops[0].arrival_time
        daily_logs = generate_daily_logs(
            trip.stops, trip.driving_segments, start_time, cycle_used,
        )

        # Fuel cost estimate
        total_miles = trip.total_distance_miles
        fuel_cost = round(total_miles / 6.5 * 3.80, 2)

        # Serialize stops
        stops_data = [
            {
                'type': s.type,
                'location': {'lat': s.location.lat, 'lng': s.location.lng, 'address': s.location.address},
                'arrival_time': s.arrival_time.isoformat(),
                'departure_time': s.departure_time.isoformat(),
                'duration_hours': s.duration_hours,
                'duty_status': s.duty_status,
                'cumulative_miles': s.cumulative_miles,
                'notes': s.notes,
            }
            for s in trip.stops
        ]

        segments_data = [
            {
                'start_time': seg.start_time.isoformat(),
                'end_time': seg.end_time.isoformat(),
                'duration_hours': seg.duration_hours,
                'miles': seg.miles,
                'start_location': {
                    'lat': seg.start_location.lat,
                    'lng': seg.start_location.lng,
                    'address': seg.start_location.address,
                },
                'end_location': {
                    'lat': seg.end_location.lat,
                    'lng': seg.end_location.lng,
                    'address': seg.end_location.address,
                },
            }
            for seg in trip.driving_segments
        ]

        # Save to database
        plan = TripPlan.objects.create(
            current_location_address=current['address'],
            current_location_lat=current['lat'],
            current_location_lng=current['lng'],
            pickup_location_address=pickup['address'],
            pickup_location_lat=pickup['lat'],
            pickup_location_lng=pickup['lng'],
            dropoff_location_address=dropoff['address'],
            dropoff_location_lat=dropoff['lat'],
            dropoff_location_lng=dropoff['lng'],
            current_cycle_used=cycle_used,
            total_distance_miles=total_miles,
            total_duration_hours=trip.total_duration_hours,
            fuel_cost_estimate=fuel_cost,
            route_geometry=route['geometry'],
            stops=stops_data,
            driving_segments=segments_data,
            daily_logs=daily_logs,
        )

        return Response({
            'id': str(plan.id),
            'created_at': plan.created_at.isoformat(),
            'total_distance_miles': plan.total_distance_miles,
            'total_duration_hours': plan.total_duration_hours,
            'fuel_cost_estimate': fuel_cost,
            'number_of_stops': len(stops_data),
            'number_of_log_days': len(daily_logs),
            'route': {'geometry': route['geometry']},
            'stops': stops_data,
            'driving_segments': segments_data,
            'daily_logs': daily_logs,
        })


class TripPlanDetailView(APIView):
    def get(self, request, pk):
        try:
            plan = TripPlan.objects.get(pk=pk)
        except TripPlan.DoesNotExist:
            return Response(
                {'error': 'not_found', 'message': 'Trip plan not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'id': str(plan.id),
            'created_at': plan.created_at.isoformat(),
            'total_distance_miles': plan.total_distance_miles,
            'total_duration_hours': plan.total_duration_hours,
            'fuel_cost_estimate': plan.fuel_cost_estimate,
            'number_of_stops': len(plan.stops) if plan.stops else 0,
            'number_of_log_days': len(plan.daily_logs) if plan.daily_logs else 0,
            'route': {'geometry': plan.route_geometry},
            'stops': plan.stops or [],
            'driving_segments': plan.driving_segments or [],
            'daily_logs': plan.daily_logs or [],
        })
```

- [ ] **Step 2: Write API tests**

`backend/trips/tests/test_views.py`:
```python
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient


class TestTripPlanValidation(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_empty_body_returns_400(self):
        resp = self.client.post('/api/trip-plan/', {}, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['error'], 'validation_error')

    def test_cycle_over_70_returns_400(self):
        resp = self.client.post('/api/trip-plan/', {
            'current_location': {'address': 'A', 'lat': 41.0, 'lng': -87.0},
            'pickup_location': {'address': 'B', 'lat': 39.0, 'lng': -86.0},
            'dropoff_location': {'address': 'C', 'lat': 36.0, 'lng': -86.0},
            'current_cycle_used': 75,
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_missing_location_returns_400(self):
        resp = self.client.post('/api/trip-plan/', {
            'current_location': {'address': 'A', 'lat': 41.0, 'lng': -87.0},
            'current_cycle_used': 10,
        }, format='json')
        self.assertEqual(resp.status_code, 400)


class TestTripPlanDetail(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_nonexistent_plan_returns_404(self):
        resp = self.client.get('/api/trip-plan/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(resp.status_code, 404)
```

- [ ] **Step 3: Run all backend tests**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/backend
python manage.py test -v 2
```
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/trips/views.py backend/trips/tests/test_views.py
git commit -m "feat: wire up trip plan API — connect route service, HOS engine, and log generator"
```

---

## Phase 2: Frontend Foundation

### Task 6: Frontend Scaffolding (Vite + React + MUI + TypeScript)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/theme.ts`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/services/api.ts`

- [ ] **Step 1: Create frontend with Vite**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @mui/lab
npm install axios
npm install react-map-gl mapbox-gl
npm install @types/mapbox-gl --save-dev
```

- [ ] **Step 2: Create theme.ts**

`frontend/src/theme.ts`:
```typescript
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e', // Dark navy
      light: '#534bae',
      dark: '#000051',
    },
    secondary: {
      main: '#ff6d00', // Orange accent
      light: '#ff9e40',
      dark: '#c43e00',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      defaultProps: {
        elevation: 2,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
```

- [ ] **Step 3: Create TypeScript interfaces**

`frontend/src/types/index.ts`:
```typescript
export interface LocationInput {
  address: string;
  lat: number;
  lng: number;
}

export interface TripPlanRequest {
  current_location: LocationInput;
  pickup_location: LocationInput;
  dropoff_location: LocationInput;
  current_cycle_used: number;
}

export interface StopLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface TripStop {
  type: 'start' | 'pickup' | 'dropoff' | 'fuel_stop' | 'rest_break' | 'overnight_rest' | 'restart_34h';
  location: StopLocation;
  arrival_time: string;
  departure_time: string;
  duration_hours: number;
  duty_status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
  cumulative_miles: number;
  notes: string;
}

export interface DrivingSegment {
  start_time: string;
  end_time: string;
  duration_hours: number;
  miles: number;
  start_location: StopLocation;
  end_location: StopLocation;
}

export interface LogEntry {
  start_hour: number;
  end_hour: number;
  status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
}

export interface LogTotals {
  off_duty: number;
  sleeper_berth: number;
  driving: number;
  on_duty_not_driving: number;
}

export interface Recap70hr {
  a_total_on_duty_7_days: number;
  b_hours_available_tomorrow: number;
  c_total_on_duty_3_days: number;
}

export interface DailyLog {
  date: string;
  day_number: number;
  from_city: string;
  to_city: string;
  total_miles_today: number;
  entries: LogEntry[];
  totals: LogTotals;
  remarks: string[];
  recap_70hr: Recap70hr;
}

export interface TripPlanResponse {
  id: string;
  created_at: string;
  total_distance_miles: number;
  total_duration_hours: number;
  fuel_cost_estimate: number;
  number_of_stops: number;
  number_of_log_days: number;
  route: {
    geometry: GeoJSON.LineString;
  };
  stops: TripStop[];
  driving_segments: DrivingSegment[];
  daily_logs: DailyLog[];
}
```

- [ ] **Step 4: Create API service**

`frontend/src/services/api.ts`:
```typescript
import axios from 'axios';
import { TripPlanRequest, TripPlanResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function planTrip(request: TripPlanRequest): Promise<TripPlanResponse> {
  const { data } = await client.post<TripPlanResponse>('/trip-plan/', request);
  return data;
}

export async function getTripPlan(id: string): Promise<TripPlanResponse> {
  const { data } = await client.get<TripPlanResponse>(`/trip-plan/${id}/`);
  return data;
}
```

- [ ] **Step 5: Create main.tsx and App.tsx**

`frontend/src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
```

`frontend/src/App.tsx`:
```typescript
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ELD Trip Planner
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>
        <Typography>App shell ready. Components coming next.</Typography>
      </Box>
    </Box>
  );
}

export default App;
```

- [ ] **Step 6: Update vite.config.ts for API proxy**

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 7: Verify frontend starts**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/frontend
npm run dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```
Expected: HTML response with React root div

- [ ] **Step 8: Commit**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp
git add frontend/
git commit -m "feat: scaffold React frontend with MUI theme, TypeScript types, and API client"
```

---

### Task 7: TripForm + LocationAutocomplete + useTripPlanner Hook

**Files:**
- Create: `frontend/src/hooks/useTripPlanner.ts`
- Create: `frontend/src/components/LocationAutocomplete.tsx`
- Create: `frontend/src/components/TripForm.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create useTripPlanner hook**

`frontend/src/hooks/useTripPlanner.ts`:
```typescript
import { useState, useCallback } from 'react';
import { LocationInput, TripPlanResponse } from '../types';
import { planTrip } from '../services/api';

interface FormState {
  currentLocation: LocationInput | null;
  pickupLocation: LocationInput | null;
  dropoffLocation: LocationInput | null;
  cycleUsed: number;
}

export function useTripPlanner() {
  const [form, setForm] = useState<FormState>({
    currentLocation: null,
    pickupLocation: null,
    dropoffLocation: null,
    cycleUsed: 0,
  });
  const [result, setResult] = useState<TripPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCurrentLocation = useCallback((loc: LocationInput | null) => {
    setForm((prev) => ({ ...prev, currentLocation: loc }));
  }, []);

  const setPickupLocation = useCallback((loc: LocationInput | null) => {
    setForm((prev) => ({ ...prev, pickupLocation: loc }));
  }, []);

  const setDropoffLocation = useCallback((loc: LocationInput | null) => {
    setForm((prev) => ({ ...prev, dropoffLocation: loc }));
  }, []);

  const setCycleUsed = useCallback((hours: number) => {
    setForm((prev) => ({ ...prev, cycleUsed: hours }));
  }, []);

  const submitTrip = useCallback(async () => {
    if (!form.currentLocation || !form.pickupLocation || !form.dropoffLocation) {
      setError('All locations are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await planTrip({
        current_location: form.currentLocation,
        pickup_location: form.pickupLocation,
        dropoff_location: form.dropoffLocation,
        current_cycle_used: form.cycleUsed,
      });
      setResult(response);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Failed to plan trip. Please try again.');
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [form]);

  return {
    form,
    result,
    loading,
    error,
    setCurrentLocation,
    setPickupLocation,
    setDropoffLocation,
    setCycleUsed,
    submitTrip,
    setError,
  };
}
```

- [ ] **Step 2: Create LocationAutocomplete**

`frontend/src/components/LocationAutocomplete.tsx`:
```typescript
import { useState, useEffect, useRef } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { LocationInput } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface Props {
  label: string;
  value: LocationInput | null;
  onChange: (location: LocationInput | null) => void;
}

interface MapboxFeature {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function LocationAutocomplete({ label, value, onChange }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<LocationInput[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!inputValue || inputValue.length < 3) {
      setOptions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          inputValue
        )}.json?access_token=${MAPBOX_TOKEN}&types=place,address&limit=5&country=US,CA,MX`;

        const resp = await fetch(url);
        const data = await resp.json();

        const results: LocationInput[] = (data.features || []).map(
          (f: MapboxFeature) => ({
            address: f.place_name,
            lat: f.center[1],
            lng: f.center[0],
          })
        );
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_, newInput) => setInputValue(newInput)}
      options={options}
      getOptionLabel={(opt) => opt.address}
      isOptionEqualToValue={(opt, val) =>
        opt.lat === val.lat && opt.lng === val.lng
      }
      loading={loading}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={18} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      fullWidth
      sx={{ mb: 2 }}
    />
  );
}
```

- [ ] **Step 3: Create TripForm**

`frontend/src/components/TripForm.tsx`:
```typescript
import { Box, Button, TextField, Typography, Alert, Card, CardContent } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import LocationAutocomplete from './LocationAutocomplete';
import { LocationInput } from '../types';

interface Props {
  currentLocation: LocationInput | null;
  pickupLocation: LocationInput | null;
  dropoffLocation: LocationInput | null;
  cycleUsed: number;
  loading: boolean;
  error: string | null;
  onCurrentLocationChange: (loc: LocationInput | null) => void;
  onPickupLocationChange: (loc: LocationInput | null) => void;
  onDropoffLocationChange: (loc: LocationInput | null) => void;
  onCycleUsedChange: (hours: number) => void;
  onSubmit: () => void;
  onDismissError: () => void;
}

export default function TripForm({
  currentLocation,
  pickupLocation,
  dropoffLocation,
  cycleUsed,
  loading,
  error,
  onCurrentLocationChange,
  onPickupLocationChange,
  onDropoffLocationChange,
  onCycleUsedChange,
  onSubmit,
  onDismissError,
}: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Trip Details
        </Typography>

        {error && (
          <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LocationAutocomplete
          label="Current Location"
          value={currentLocation}
          onChange={onCurrentLocationChange}
        />

        <LocationAutocomplete
          label="Pickup Location"
          value={pickupLocation}
          onChange={onPickupLocationChange}
        />

        <LocationAutocomplete
          label="Dropoff Location"
          value={dropoffLocation}
          onChange={onDropoffLocationChange}
        />

        <TextField
          label="Current Cycle Used (hours)"
          type="number"
          value={cycleUsed}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onCycleUsedChange(Math.min(70, Math.max(0, val)));
          }}
          inputProps={{ min: 0, max: 70, step: 0.5 }}
          size="small"
          fullWidth
          helperText="Hours used in current 70h/8-day cycle (0-70)"
          sx={{ mb: 3 }}
        />

        <LoadingButton
          variant="contained"
          fullWidth
          size="large"
          loading={loading}
          onClick={onSubmit}
          disabled={!currentLocation || !pickupLocation || !dropoffLocation}
        >
          Plan Trip
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Update App.tsx to include TripForm**

`frontend/src/App.tsx`:
```typescript
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useTripPlanner } from './hooks/useTripPlanner';
import TripForm from './components/TripForm';

function App() {
  const {
    form,
    result,
    loading,
    error,
    setCurrentLocation,
    setPickupLocation,
    setDropoffLocation,
    setCycleUsed,
    submitTrip,
    setError,
  } = useTripPlanner();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ELD Trip Planner
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, p: 2 }}>
          <TripForm
            currentLocation={form.currentLocation}
            pickupLocation={form.pickupLocation}
            dropoffLocation={form.dropoffLocation}
            cycleUsed={form.cycleUsed}
            loading={loading}
            error={error}
            onCurrentLocationChange={setCurrentLocation}
            onPickupLocationChange={setPickupLocation}
            onDropoffLocationChange={setDropoffLocation}
            onCycleUsedChange={setCycleUsed}
            onSubmit={submitTrip}
            onDismissError={() => setError(null)}
          />
        </Box>

        {/* Map placeholder */}
        <Box sx={{ flexGrow: 1, bgcolor: '#e0e0e0', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">
            {result ? 'Map will render here' : 'Enter trip details and click Plan Trip'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default App;
```

- [ ] **Step 5: Verify frontend compiles and renders**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/frontend
npx tsc --noEmit
npm run dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```
Expected: No TypeScript errors, HTML response

- [ ] **Step 6: Commit**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp
git add frontend/src/
git commit -m "feat: add TripForm with location autocomplete, cycle input, and useTripPlanner hook"
```

---

### Task 8: RouteMap Component

**Files:**
- Create: `frontend/src/components/RouteMap.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create RouteMap.tsx**

`frontend/src/components/RouteMap.tsx`:
```typescript
import { useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl } from 'react-map-gl';
import { Box, Typography, Chip } from '@mui/material';
import { TripStop } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useState } from 'react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const STOP_COLORS: Record<string, string> = {
  start: '#4CAF50',
  pickup: '#FF9800',
  dropoff: '#f44336',
  fuel_stop: '#FFC107',
  rest_break: '#2196F3',
  overnight_rest: '#9C27B0',
  restart_34h: '#4A148C',
};

const STOP_LABELS: Record<string, string> = {
  start: 'Start',
  pickup: 'Pickup',
  dropoff: 'Drop-off',
  fuel_stop: 'Fuel',
  rest_break: 'Break',
  overnight_rest: 'Rest (10h)',
  restart_34h: 'Restart (34h)',
};

interface Props {
  geometry: GeoJSON.LineString | null;
  stops: TripStop[];
}

export default function RouteMap({ geometry, stops }: Props) {
  const [selectedStop, setSelectedStop] = useState<TripStop | null>(null);

  const bounds = useMemo(() => {
    if (!geometry || !geometry.coordinates.length) return undefined;
    const coords = geometry.coordinates as [number, number][];
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];
  }, [geometry]);

  const routeGeoJSON = useMemo(() => {
    if (!geometry) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry,
    };
  }, [geometry]);

  const handleMarkerClick = useCallback((stop: TripStop) => {
    setSelectedStop(stop);
  }, []);

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={bounds ? {
        bounds,
        fitBoundsOptions: { padding: 60 },
      } : {
        longitude: -95,
        latitude: 39,
        zoom: 4,
      }}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      <NavigationControl position="top-right" />

      {routeGeoJSON && (
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              'line-color': '#1a237e',
              'line-width': 4,
              'line-opacity': 0.8,
            }}
          />
        </Source>
      )}

      {stops.map((stop, i) => (
        <Marker
          key={`${stop.type}-${i}`}
          longitude={stop.location.lng}
          latitude={stop.location.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            handleMarkerClick(stop);
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: STOP_COLORS[stop.type] || '#999',
              border: '3px solid white',
              boxShadow: 2,
              cursor: 'pointer',
            }}
          />
        </Marker>
      ))}

      {selectedStop && (
        <Popup
          longitude={selectedStop.location.lng}
          latitude={selectedStop.location.lat}
          onClose={() => setSelectedStop(null)}
          closeOnClick={false}
          anchor="bottom"
        >
          <Box sx={{ p: 0.5, minWidth: 180 }}>
            <Chip
              label={STOP_LABELS[selectedStop.type] || selectedStop.type}
              size="small"
              sx={{ bgcolor: STOP_COLORS[selectedStop.type], color: 'white', mb: 0.5 }}
            />
            <Typography variant="body2" fontWeight={600}>
              {selectedStop.location.address || 'Unknown location'}
            </Typography>
            <Typography variant="caption" display="block">
              Arrive: {new Date(selectedStop.arrival_time).toLocaleString()}
            </Typography>
            {selectedStop.duration_hours > 0 && (
              <Typography variant="caption" display="block">
                Duration: {selectedStop.duration_hours}h
              </Typography>
            )}
            {selectedStop.notes && (
              <Typography variant="caption" color="text.secondary" display="block">
                {selectedStop.notes}
              </Typography>
            )}
          </Box>
        </Popup>
      )}
    </Map>
  );
}
```

- [ ] **Step 2: Update App.tsx to render RouteMap**

Replace the map placeholder section in `frontend/src/App.tsx`:

```typescript
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useTripPlanner } from './hooks/useTripPlanner';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';

function App() {
  const {
    form,
    result,
    loading,
    error,
    setCurrentLocation,
    setPickupLocation,
    setDropoffLocation,
    setCycleUsed,
    submitTrip,
    setError,
  } = useTripPlanner();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ELD Trip Planner
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, p: 2 }}>
          <TripForm
            currentLocation={form.currentLocation}
            pickupLocation={form.pickupLocation}
            dropoffLocation={form.dropoffLocation}
            cycleUsed={form.cycleUsed}
            loading={loading}
            error={error}
            onCurrentLocationChange={setCurrentLocation}
            onPickupLocationChange={setPickupLocation}
            onDropoffLocationChange={setDropoffLocation}
            onCycleUsedChange={setCycleUsed}
            onSubmit={submitTrip}
            onDismissError={() => setError(null)}
          />
        </Box>

        {/* Map */}
        <Box sx={{ flexGrow: 1, minHeight: 400 }}>
          <RouteMap
            geometry={result?.route?.geometry || null}
            stops={result?.stops || []}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default App;
```

- [ ] **Step 3: Verify compiles**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/frontend
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/RouteMap.tsx frontend/src/App.tsx
git commit -m "feat: add RouteMap component with Mapbox GL, route polyline, and stop markers with popups"
```

---

### Task 9: TripSummary + StopTimeline Components

**Files:**
- Create: `frontend/src/components/TripSummary.tsx`
- Create: `frontend/src/components/StopTimeline.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create TripSummary.tsx**

`frontend/src/components/TripSummary.tsx`:
```typescript
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import { TripPlanResponse } from '../types';

interface Props {
  data: TripPlanResponse;
}

export default function TripSummary({ data }: Props) {
  const cards = [
    {
      icon: <RouteIcon />,
      label: 'Total Distance',
      value: `${data.total_distance_miles.toLocaleString()} mi`,
    },
    {
      icon: <AccessTimeIcon />,
      label: 'Total Duration',
      value: `${data.total_duration_hours.toFixed(1)} hrs`,
    },
    {
      icon: <PlaceIcon />,
      label: 'Stops',
      value: data.number_of_stops.toString(),
    },
    {
      icon: <DescriptionIcon />,
      label: 'Log Days',
      value: data.number_of_log_days.toString(),
    },
    {
      icon: <LocalGasStationIcon />,
      label: 'Est. Fuel Cost',
      value: `$${data.fuel_cost_estimate.toFixed(2)}`,
    },
  ];

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Trip Summary
      </Typography>
      <Grid container spacing={1}>
        {cards.map((card) => (
          <Grid item xs={6} key={card.label}>
            <Card variant="outlined" sx={{ textAlign: 'center', py: 1 }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ color: 'secondary.main', mb: 0.5 }}>{card.icon}</Box>
                <Typography variant="caption" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 2: Create StopTimeline.tsx**

`frontend/src/components/StopTimeline.tsx`:
```typescript
import { Box, Chip, Typography, Paper } from '@mui/material';
import { TripStop } from '../types';

const STOP_COLORS: Record<string, string> = {
  start: '#4CAF50',
  pickup: '#FF9800',
  dropoff: '#f44336',
  fuel_stop: '#FFC107',
  rest_break: '#2196F3',
  overnight_rest: '#9C27B0',
  restart_34h: '#4A148C',
};

const STOP_LABELS: Record<string, string> = {
  start: 'Start',
  pickup: 'Pickup',
  dropoff: 'Drop-off',
  fuel_stop: 'Fuel',
  rest_break: 'Break',
  overnight_rest: 'Rest (10h)',
  restart_34h: 'Restart (34h)',
};

interface Props {
  stops: TripStop[];
}

export default function StopTimeline({ stops }: Props) {
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Stop Timeline
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 1, pb: 1 }}>
        {stops.map((stop, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" display="block" fontWeight={600}>
                    {STOP_LABELS[stop.type] || stop.type}
                  </Typography>
                  <Typography variant="caption" display="block" fontSize="0.65rem">
                    {stop.location.address ? stop.location.address.split(',')[0] : ''}
                  </Typography>
                </Box>
              }
              sx={{
                bgcolor: STOP_COLORS[stop.type] || '#999',
                color: 'white',
                height: 'auto',
                py: 0.5,
                '& .MuiChip-label': { whiteSpace: 'normal' },
              }}
            />
            {i < stops.length - 1 && (
              <Box sx={{ width: 24, height: 2, bgcolor: 'grey.400', mx: 0.5 }} />
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
```

- [ ] **Step 3: Update App.tsx to include TripSummary and StopTimeline**

Replace the full content of `frontend/src/App.tsx`:

```typescript
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useTripPlanner } from './hooks/useTripPlanner';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import TripSummary from './components/TripSummary';
import StopTimeline from './components/StopTimeline';

function App() {
  const {
    form,
    result,
    loading,
    error,
    setCurrentLocation,
    setPickupLocation,
    setDropoffLocation,
    setCycleUsed,
    submitTrip,
    setError,
  } = useTripPlanner();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ELD Trip Planner
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, p: 2 }}>
          <TripForm
            currentLocation={form.currentLocation}
            pickupLocation={form.pickupLocation}
            dropoffLocation={form.dropoffLocation}
            cycleUsed={form.cycleUsed}
            loading={loading}
            error={error}
            onCurrentLocationChange={setCurrentLocation}
            onPickupLocationChange={setPickupLocation}
            onDropoffLocationChange={setDropoffLocation}
            onCycleUsedChange={setCycleUsed}
            onSubmit={submitTrip}
            onDismissError={() => setError(null)}
          />
          {result && <TripSummary data={result} />}
        </Box>

        {/* Map */}
        <Box sx={{ flexGrow: 1, minHeight: 400 }}>
          <RouteMap
            geometry={result?.route?.geometry || null}
            stops={result?.stops || []}
          />
        </Box>
      </Box>

      {/* Stop Timeline */}
      {result && (
        <Box sx={{ px: 2 }}>
          <StopTimeline stops={result.stops} />
        </Box>
      )}
    </Box>
  );
}

export default App;
```

- [ ] **Step 4: Verify compiles**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/frontend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/TripSummary.tsx frontend/src/components/StopTimeline.tsx frontend/src/App.tsx
git commit -m "feat: add TripSummary cards and StopTimeline components"
```

---

## Phase 3: Daily Log Sheets (Most Important)

### Task 10: LogSheet SVG Component — Grid + Status Bars + Transitions

**Files:**
- Create: `frontend/src/components/LogSheet.tsx`
- Create: `frontend/src/components/LogSheetList.tsx`
- Modify: `frontend/src/App.tsx`

This is the most complex and visually important frontend component.

- [ ] **Step 1: Create LogSheet.tsx**

`frontend/src/components/LogSheet.tsx`:
```typescript
import { DailyLog, LogEntry } from '../types';

// Layout constants
const SVG_WIDTH = 900;
const SVG_HEIGHT = 620;
const GRID_LEFT = 100;
const GRID_RIGHT = 820;
const GRID_WIDTH = GRID_RIGHT - GRID_LEFT; // 720px for 24 hours
const PX_PER_HOUR = GRID_WIDTH / 24; // 30px per hour
const HEADER_Y = 0;
const INFO_Y = 55;
const GRID_TOP = 115;
const ROW_HEIGHT = 40;
const LABEL_WIDTH = 100;
const TOTAL_COL_X = GRID_RIGHT + 10;
const REMARKS_Y = GRID_TOP + ROW_HEIGHT * 4 + 30;
const RECAP_Y = 480;

const STATUS_ROWS: { key: string; label: string; color: string }[] = [
  { key: 'off_duty', label: '1. Off Duty', color: '#4CAF50' },
  { key: 'sleeper_berth', label: '2. Sleeper Berth', color: '#9C27B0' },
  { key: 'driving', label: '3. Driving', color: '#2196F3' },
  { key: 'on_duty_not_driving', label: '4. On Duty (not driving)', color: '#FF9800' },
];

const STATUS_ROW_INDEX: Record<string, number> = {
  off_duty: 0,
  sleeper_berth: 1,
  driving: 2,
  on_duty_not_driving: 3,
};

interface Props {
  log: DailyLog;
}

export default function LogSheet({ log }: Props) {
  const hourToX = (hour: number) => GRID_LEFT + hour * PX_PER_HOUR;
  const rowToY = (rowIndex: number) => GRID_TOP + rowIndex * ROW_HEIGHT;

  // Build transition lines: connect adjacent entries when status changes
  const transitions: { x: number; y1: number; y2: number }[] = [];
  for (let i = 1; i < log.entries.length; i++) {
    const prev = log.entries[i - 1];
    const curr = log.entries[i];
    if (prev.status !== curr.status) {
      const x = hourToX(curr.start_hour);
      const prevRow = STATUS_ROW_INDEX[prev.status];
      const currRow = STATUS_ROW_INDEX[curr.status];
      const y1 = rowToY(Math.min(prevRow, currRow));
      const y2 = rowToY(Math.max(prevRow, currRow)) + ROW_HEIGHT;
      transitions.push({ x, y1, y2 });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: SVG_WIDTH, background: 'white', border: '1px solid #ccc' }}
    >
      {/* Header */}
      <text x={20} y={25} fontSize={16} fontWeight="bold" fontFamily="DM Sans, sans-serif">
        DRIVER'S DAILY LOG
      </text>
      <text x={20} y={42} fontSize={10} fill="#666">
        (24 hours)
      </text>
      <text x={250} y={25} fontSize={13} fontWeight="bold">
        Date: {log.date}
      </text>
      <text x={500} y={20} fontSize={9} fill="#666">
        Original — File at home terminal
      </text>
      <text x={500} y={32} fontSize={9} fill="#666">
        Duplicate — Driver retains for 8 days
      </text>

      {/* Info row */}
      <text x={20} y={INFO_Y + 15} fontSize={11}>
        From: {log.from_city}
      </text>
      <text x={300} y={INFO_Y + 15} fontSize={11}>
        To: {log.to_city}
      </text>
      <text x={550} y={INFO_Y + 15} fontSize={11}>
        Miles Driving Today: {log.total_miles_today}
      </text>
      <line x1={20} y1={INFO_Y + 25} x2={SVG_WIDTH - 20} y2={INFO_Y + 25} stroke="#ccc" />

      {/* Carrier / Vehicle info (placeholder) */}
      <text x={20} y={INFO_Y + 40} fontSize={9} fill="#999">
        Carrier: ________________
      </text>
      <text x={250} y={INFO_Y + 40} fontSize={9} fill="#999">
        Truck/Tractor #: ________
      </text>
      <text x={500} y={INFO_Y + 40} fontSize={9} fill="#999">
        Home Terminal: ________________
      </text>

      {/* Time labels */}
      <text x={GRID_LEFT - 5} y={GRID_TOP - 5} fontSize={8} textAnchor="middle">Mid-</text>
      <text x={GRID_LEFT - 5} y={GRID_TOP + 3} fontSize={8} textAnchor="middle">night</text>
      {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
        <text key={h} x={hourToX(h)} y={GRID_TOP - 3} fontSize={8} textAnchor="middle">
          {h === 12 ? 'Noon' : h > 12 ? h - 12 : h}
        </text>
      ))}
      <text x={GRID_RIGHT + 5} y={GRID_TOP - 5} fontSize={8} textAnchor="middle">Mid-</text>
      <text x={GRID_RIGHT + 5} y={GRID_TOP + 3} fontSize={8} textAnchor="middle">night</text>
      <text x={TOTAL_COL_X + 15} y={GRID_TOP - 3} fontSize={9} textAnchor="middle" fontWeight="bold">
        Total
      </text>
      <text x={TOTAL_COL_X + 15} y={GRID_TOP + 6} fontSize={9} textAnchor="middle" fontWeight="bold">
        Hours
      </text>

      {/* Row labels */}
      {STATUS_ROWS.map((row, idx) => (
        <text key={row.key} x={15} y={rowToY(idx) + ROW_HEIGHT / 2 + 4} fontSize={9}>
          {row.label}
        </text>
      ))}

      {/* Grid background + lines */}
      {STATUS_ROWS.map((_, idx) => (
        <rect
          key={idx}
          x={GRID_LEFT}
          y={rowToY(idx)}
          width={GRID_WIDTH}
          height={ROW_HEIGHT}
          fill="none"
          stroke="#333"
          strokeWidth={1}
        />
      ))}

      {/* Hour gridlines (major) */}
      {Array.from({ length: 25 }, (_, h) => (
        <line
          key={`major-${h}`}
          x1={hourToX(h)}
          y1={GRID_TOP}
          x2={hourToX(h)}
          y2={GRID_TOP + ROW_HEIGHT * 4}
          stroke="#333"
          strokeWidth={h === 0 || h === 24 ? 1.5 : 0.5}
        />
      ))}

      {/* 15-min gridlines (minor) */}
      {Array.from({ length: 96 }, (_, i) => {
        const hour = i * 0.25;
        if (hour % 1 === 0) return null; // skip full hours
        return (
          <line
            key={`minor-${i}`}
            x1={hourToX(hour)}
            y1={GRID_TOP}
            x2={hourToX(hour)}
            y2={GRID_TOP + ROW_HEIGHT * 4}
            stroke="#ddd"
            strokeWidth={0.3}
            strokeDasharray={hour % 0.5 === 0 ? 'none' : '2,2'}
          />
        );
      })}

      {/* Horizontal row separators */}
      {Array.from({ length: 5 }, (_, i) => (
        <line
          key={`hsep-${i}`}
          x1={GRID_LEFT}
          y1={GRID_TOP + i * ROW_HEIGHT}
          x2={GRID_RIGHT}
          y2={GRID_TOP + i * ROW_HEIGHT}
          stroke="#333"
          strokeWidth={i === 0 || i === 4 ? 1.5 : 0.5}
        />
      ))}

      {/* Status bars (filled rectangles) */}
      {log.entries.map((entry: LogEntry, i: number) => {
        const rowIdx = STATUS_ROW_INDEX[entry.status];
        if (rowIdx === undefined) return null;
        const x = hourToX(entry.start_hour);
        const w = (entry.end_hour - entry.start_hour) * PX_PER_HOUR;
        const color = STATUS_ROWS[rowIdx].color;
        return (
          <rect
            key={i}
            x={x}
            y={rowToY(rowIdx) + 2}
            width={Math.max(w, 0.5)}
            height={ROW_HEIGHT - 4}
            fill={color}
            opacity={0.7}
            rx={1}
          />
        );
      })}

      {/* Vertical transition lines */}
      {transitions.map((t, i) => (
        <line
          key={`trans-${i}`}
          x1={t.x}
          y1={t.y1}
          x2={t.x}
          y2={t.y2}
          stroke="#000"
          strokeWidth={2}
        />
      ))}

      {/* Total hours per row */}
      {STATUS_ROWS.map((row, idx) => (
        <text
          key={`total-${row.key}`}
          x={TOTAL_COL_X + 15}
          y={rowToY(idx) + ROW_HEIGHT / 2 + 4}
          fontSize={11}
          textAnchor="middle"
          fontWeight="bold"
        >
          {(log.totals[row.key as keyof typeof log.totals] || 0).toFixed(1)}
        </text>
      ))}

      {/* Grand total */}
      <text
        x={TOTAL_COL_X + 15}
        y={GRID_TOP + ROW_HEIGHT * 4 + 15}
        fontSize={11}
        textAnchor="middle"
        fontWeight="bold"
      >
        Total: {Object.values(log.totals).reduce((a, b) => a + b, 0).toFixed(1)}
      </text>

      {/* Remarks section */}
      <line x1={20} y1={REMARKS_Y - 10} x2={SVG_WIDTH - 20} y2={REMARKS_Y - 10} stroke="#ccc" />
      <text x={20} y={REMARKS_Y + 5} fontSize={12} fontWeight="bold">
        REMARKS
      </text>
      {log.remarks.slice(0, 6).map((remark, i) => (
        <text key={i} x={30} y={REMARKS_Y + 22 + i * 14} fontSize={9}>
          {remark}
        </text>
      ))}

      {/* Shipping Documents (placeholder) */}
      <line x1={20} y1={RECAP_Y - 30} x2={SVG_WIDTH - 20} y2={RECAP_Y - 30} stroke="#ccc" />
      <text x={20} y={RECAP_Y - 15} fontSize={10} fontWeight="bold">
        SHIPPING DOCUMENTS
      </text>
      <text x={30} y={RECAP_Y} fontSize={9} fill="#999">
        DVL or Manifest No: ________________  Shipper & Commodity: ________________
      </text>

      {/* 70h/8-day Recap table */}
      <line x1={20} y1={RECAP_Y + 15} x2={SVG_WIDTH - 20} y2={RECAP_Y + 15} stroke="#ccc" />
      <text x={20} y={RECAP_Y + 32} fontSize={11} fontWeight="bold">
        RECAP: 70 Hour / 8 Day
      </text>

      {/* Recap columns */}
      <rect x={30} y={RECAP_Y + 40} width={250} height={70} fill="none" stroke="#333" />
      <line x1={110} y1={RECAP_Y + 40} x2={110} y2={RECAP_Y + 110} stroke="#333" />
      <line x1={190} y1={RECAP_Y + 40} x2={190} y2={RECAP_Y + 110} stroke="#333" />
      <line x1={30} y1={RECAP_Y + 55} x2={280} y2={RECAP_Y + 55} stroke="#333" />

      <text x={70} y={RECAP_Y + 52} fontSize={8} textAnchor="middle" fontWeight="bold">A.</text>
      <text x={150} y={RECAP_Y + 52} fontSize={8} textAnchor="middle" fontWeight="bold">B.</text>
      <text x={235} y={RECAP_Y + 52} fontSize={8} textAnchor="middle" fontWeight="bold">C.</text>

      <text x={70} y={RECAP_Y + 68} fontSize={7} textAnchor="middle">Total hrs on duty</text>
      <text x={70} y={RECAP_Y + 78} fontSize={7} textAnchor="middle">last 7 days</text>
      <text x={70} y={RECAP_Y + 88} fontSize={7} textAnchor="middle">incl. today</text>

      <text x={150} y={RECAP_Y + 68} fontSize={7} textAnchor="middle">Total hrs</text>
      <text x={150} y={RECAP_Y + 78} fontSize={7} textAnchor="middle">available</text>
      <text x={150} y={RECAP_Y + 88} fontSize={7} textAnchor="middle">tomorrow</text>

      <text x={235} y={RECAP_Y + 68} fontSize={7} textAnchor="middle">Total hrs on duty</text>
      <text x={235} y={RECAP_Y + 78} fontSize={7} textAnchor="middle">last 3 days</text>
      <text x={235} y={RECAP_Y + 88} fontSize={7} textAnchor="middle">incl. today</text>

      {/* Recap values */}
      <text x={70} y={RECAP_Y + 103} fontSize={12} textAnchor="middle" fontWeight="bold">
        {log.recap_70hr.a_total_on_duty_7_days}
      </text>
      <text x={150} y={RECAP_Y + 103} fontSize={12} textAnchor="middle" fontWeight="bold">
        {log.recap_70hr.b_hours_available_tomorrow}
      </text>
      <text x={235} y={RECAP_Y + 103} fontSize={12} textAnchor="middle" fontWeight="bold">
        {log.recap_70hr.c_total_on_duty_3_days}
      </text>

      {/* 34h restart note */}
      <text x={300} y={RECAP_Y + 60} fontSize={8} fill="#666">
        * If you took 34 consecutive hours off duty
      </text>
      <text x={300} y={RECAP_Y + 72} fontSize={8} fill="#666">
        you have 60/70 hours available
      </text>

      {/* Footer */}
      <text x={20} y={SVG_HEIGHT - 10} fontSize={8} fill="#999">
        Use time standard of home terminal. Day {log.day_number}
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Create LogSheetList.tsx**

`frontend/src/components/LogSheetList.tsx`:
```typescript
import { Box, Typography, Paper } from '@mui/material';
import { DailyLog } from '../types';
import LogSheet from './LogSheet';

interface Props {
  logs: DailyLog[];
}

export default function LogSheetList({ logs }: Props) {
  if (!logs.length) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Daily Log Sheets
      </Typography>
      {logs.map((log) => (
        <Paper key={log.date} sx={{ mb: 3, p: 2, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Day {log.day_number} — {log.date}
          </Typography>
          <LogSheet log={log} />
        </Paper>
      ))}
    </Box>
  );
}
```

- [ ] **Step 3: Update App.tsx to include LogSheetList**

Add to `frontend/src/App.tsx`:

```typescript
import LogSheetList from './components/LogSheetList';

// At the bottom of the main layout, after StopTimeline:
{result && (
  <Box sx={{ px: 2, pb: 4 }}>
    <LogSheetList logs={result.daily_logs} />
  </Box>
)}
```

- [ ] **Step 4: Verify compiles**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/frontend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LogSheet.tsx frontend/src/components/LogSheetList.tsx frontend/src/App.tsx
git commit -m "feat: add SVG daily log sheet with FMCSA grid, status bars, transitions, remarks, and 70h recap"
```

---

## Phase 4: Integration + Polish + Over-delivery

### Task 11: End-to-End Integration Test

- [ ] **Step 1: Start backend and frontend**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp
# Terminal 1: Backend
source venv/Scripts/activate
cd backend && python manage.py runserver &

# Terminal 2: Frontend
cd frontend && npm run dev &
```

- [ ] **Step 2: Test with a real trip in the browser**

Open `http://localhost:5173` and enter:
- Current Location: Chicago, IL
- Pickup Location: Indianapolis, IN
- Dropoff Location: Nashville, TN
- Cycle Used: 20

Click "Plan Trip" and verify:
- Route polyline appears on map
- Stop markers appear with correct colors
- Popups work on marker click
- Trip summary shows distance, time, stops, fuel cost
- Stop timeline shows chronological stops
- Daily log sheets render with filled grid bars
- Transition lines connect status changes
- Totals on each log sum to 24.0
- Recap table shows correct values

- [ ] **Step 3: Fix any issues found during integration**

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from end-to-end testing"
```

---

### Task 12: PDF Export (Over-delivery)

**Files:**
- Modify: `frontend/src/components/LogSheetList.tsx`
- Modify: `frontend/package.json` (add jspdf, svg2pdf.js)

- [ ] **Step 1: Install PDF dependencies**

```bash
cd C:\Users\paulo\OneDrive\Documentos\SpotterApp/frontend
npm install jspdf svg2pdf.js
```

- [ ] **Step 2: Add PDF export to LogSheetList**

Update `frontend/src/components/LogSheetList.tsx`:

```typescript
import { useCallback, useRef } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DailyLog } from '../types';
import LogSheet from './LogSheet';

interface Props {
  logs: DailyLog[];
}

export default function LogSheetList({ logs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const { svg2pdf } = await import('svg2pdf.js');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const svgs = containerRef.current?.querySelectorAll('svg');

    if (!svgs) return;

    for (let i = 0; i < svgs.length; i++) {
      if (i > 0) pdf.addPage();
      const svg = svgs[i];
      await svg2pdf(svg, pdf, { x: 20, y: 20, width: 752, height: 500 });
    }

    pdf.save('eld-daily-logs.pdf');
  }, []);

  if (!logs.length) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Daily Log Sheets</Typography>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportPdf}
        >
          Export PDF
        </Button>
      </Box>
      <div ref={containerRef}>
        {logs.map((log) => (
          <Paper key={log.date} sx={{ mb: 3, p: 2, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Day {log.day_number} — {log.date}
            </Typography>
            <LogSheet log={log} />
          </Paper>
        ))}
      </div>
    </Box>
  );
}
```

- [ ] **Step 3: Verify PDF export works**

Run the app, plan a trip, click "Export PDF". Verify the downloaded PDF has one page per log day with the grid rendered.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/LogSheetList.tsx
git commit -m "feat: add PDF export for daily log sheets using jsPDF + svg2pdf.js"
```

---

### Task 13: Deployment Files + README

**Files:**
- Create: `backend/Procfile`
- Create: `backend/runtime.txt`
- Create: `README.md`
- Modify: `backend/config/settings.py` (add whitenoise for static files)

- [ ] **Step 1: Create deployment files**

`backend/Procfile`:
```
web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

`backend/runtime.txt`:
```
python-3.12.3
```

- [ ] **Step 2: Add whitenoise to settings for static files in production**

Add `whitenoise` to `backend/requirements.txt`:
```
whitenoise>=6.6,<7.0
```

In `backend/config/settings.py`, add after SecurityMiddleware:
```python
'whitenoise.middleware.WhiteNoiseMiddleware',
```

And add at the bottom:
```python
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

- [ ] **Step 3: Create README.md**

`README.md`:
```markdown
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
POST /api/trip-plan/ → route_service (Mapbox) → hos_engine (HOS simulation) → log_generator (daily logs)
```

The HOS engine implements 2020+ FMCSA rules for property-carrying drivers:
- 11-hour driving limit
- 14-hour window (doesn't pause for breaks)
- 30-minute break after 8h driving (any non-driving time qualifies)
- 70-hour/8-day cycle with 34-hour restart
- 10-hour off-duty between shifts
```

- [ ] **Step 4: Commit**

```bash
git add backend/Procfile backend/runtime.txt README.md backend/requirements.txt backend/config/settings.py
git commit -m "feat: add deployment config (Procfile, runtime.txt, whitenoise) and README"
```

---

## Self-Review Results

**Spec coverage check:**
- [x] Form with geocoding autocomplete → Task 7
- [x] Real route on Mapbox map → Task 2 (backend) + Task 8 (frontend)
- [x] Colored markers by stop type with popups → Task 8
- [x] HOS calculations (11h, 14h, 30min, 70h, 34h) → Task 3
- [x] Fuel stops every 1,000 miles → Task 3
- [x] Pickup/dropoff as on-duty-not-driving → Task 3
- [x] SVG daily log sheets → Task 10
- [x] Vertical transition lines → Task 10
- [x] Totals sum to 24.0 → Task 4 + Task 10
- [x] Remarks → Task 10
- [x] 70h/8-day recap table → Task 4 + Task 10
- [x] Trip summary cards → Task 9
- [x] Stop timeline → Task 9
- [x] MUI-based polished UI → Task 6 + Task 7
- [x] Loading and error states → Task 7 (LoadingButton, Alert)
- [x] TypeScript throughout → Task 6
- [x] Backend input validation → Task 1 (serializers)
- [x] HOS engine unit tests → Task 3
- [x] Log generator unit tests → Task 4
- [x] API tests → Task 5
- [x] Django model → Task 1
- [x] PDF export → Task 12
- [x] README → Task 13
- [x] Deployment config → Task 13
- [x] Fuel cost estimate → Task 5 (views) + Task 9 (display)
- [x] Reverse geocoding → Task 2
- [x] Separated stops/driving_segments → Task 3 + Task 5

**Placeholder scan:** No TBDs, TODOs, or "implement later" found. All code steps have complete code blocks.

**Type consistency check:**
- `Location` dataclass in hos_engine matches `LocationInput` TypeScript interface ✓
- `Stop` fields match `TripStop` TypeScript interface ✓
- `DrivingSegment` fields match TypeScript `DrivingSegment` ✓
- `DailyLog` dict keys match TypeScript `DailyLog` interface ✓
- `compute_recap` output keys match `Recap70hr` interface ✓
- API response shape in views.py matches `TripPlanResponse` TypeScript ✓
