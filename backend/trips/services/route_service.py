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
