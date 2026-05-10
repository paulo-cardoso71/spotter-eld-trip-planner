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
