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
