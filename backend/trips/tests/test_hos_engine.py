from datetime import datetime
from django.test import TestCase
from trips.services.hos_engine import (
    calculate_trip, Location, DriverState, Stop,
)


TEST_GEOMETRY = {
    'type': 'LineString',
    'coordinates': [
        [-87.6298, 41.8781],
        [-87.0, 41.0],
        [-86.5, 40.5],
        [-86.1581, 39.7684],
        [-86.3, 39.0],
        [-86.5, 38.0],
        [-86.7816, 36.1627],
    ],
}

START_TIME = datetime(2026, 5, 10, 8, 0)


class TestShortTrip(TestCase):
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
    def test_11h_limit_triggers_overnight(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=200, leg_a_hours=3.5,
            leg_b_miles=800, leg_b_hours=14.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('overnight_rest', stop_types)
        overnight = [s for s in result.stops if s.type == 'overnight_rest']
        self.assertEqual(overnight[0].duration_hours, 10.0)


class TestBreakRule(TestCase):
    def test_8h_driving_triggers_break(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=500, leg_a_hours=9.0,
            leg_b_miles=100, leg_b_hours=1.8,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('rest_break', stop_types)

    def test_pickup_resets_break_clock(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=420, leg_a_hours=7.5,
            leg_b_miles=420, leg_b_hours=7.5,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        breaks = [s for s in result.stops if s.type == 'rest_break']
        self.assertEqual(len(breaks), 0)


class TestFuelStop(TestCase):
    def test_fuel_stop_at_1000_miles(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=200, leg_a_hours=3.5,
            leg_b_miles=900, leg_b_hours=15.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        fuel_stops = [s for s in result.stops if s.type == 'fuel_stop']
        self.assertGreaterEqual(len(fuel_stops), 1)
        self.assertEqual(fuel_stops[0].duty_status, 'on_duty_not_driving')

    def test_fuel_stop_satisfies_break(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=500, leg_a_hours=8.5,
            leg_b_miles=600, leg_b_hours=10.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        for i, stop in enumerate(result.stops):
            if stop.type == 'fuel_stop':
                if i + 1 < len(result.stops):
                    next_stop = result.stops[i + 1]
                    if next_stop.type == 'rest_break':
                        self.fail(
                            f"rest_break at {next_stop.arrival_time} should not appear "
                            f"after fuel_stop at {stop.arrival_time} — "
                            f"fuel stop >=30min satisfies break requirement"
                        )


class TestCycleExhaustion(TestCase):
    def test_34h_restart_when_cycle_exhausted(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=60,
            leg_a_miles=200, leg_a_hours=3.5,
            leg_b_miles=500, leg_b_hours=9.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('restart_34h', stop_types)
        restart = [s for s in result.stops if s.type == 'restart_34h'][0]
        self.assertEqual(restart.duration_hours, 34.0)

    def test_pickup_checks_cycle_before_deducting(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=59.5,
            leg_a_miles=500, leg_a_hours=9.0,
            leg_b_miles=100, leg_b_hours=1.8,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('pickup', stop_types)
        self.assertIn('dropoff', stop_types)

    def test_extreme_cycle_used_69_5(self):
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
        stop_types = [s.type for s in result.stops]
        self.assertIn('restart_34h', stop_types)


class TestWindowVsDriving(TestCase):
    def test_14h_window_expires_first(self):
        result = calculate_trip(
            current_loc=Location(41.8781, -87.6298, 'Chicago, IL'),
            pickup_loc=Location(39.7684, -86.1581, 'Indianapolis, IN'),
            dropoff_loc=Location(36.1627, -86.7816, 'Nashville, TN'),
            cycle_used=0,
            leg_a_miles=200, leg_a_hours=3.5,
            leg_b_miles=550, leg_b_hours=10.0,
            route_geometry=TEST_GEOMETRY,
            start_time=START_TIME,
        )
        stop_types = [s.type for s in result.stops]
        self.assertIn('overnight_rest', stop_types)
