from datetime import datetime, timedelta
from django.test import TestCase
from trips.services.hos_engine import Stop, DrivingSegment, Location
from trips.services.log_generator import generate_daily_logs

START = datetime(2026, 5, 10, 8, 0)
LOC = Location(41.0, -87.0, 'Test City, IL')


class TestSingleDayTrip(TestCase):
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
        total_hours = sum(logs[0]['totals'].values())
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
        self.assertGreater(totals['off_duty'], 14.0)


class TestMultiDayTrip(TestCase):
    def test_two_day_trip(self):
        overnight_start = START + timedelta(hours=10)
        overnight_end = overnight_start + timedelta(hours=10)
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
        for log in logs:
            total = sum(log['totals'].values())
            self.assertAlmostEqual(total, 24.0, places=1,
                                   msg=f"Day {log['day_number']} totals: {log['totals']}")

    def test_midnight_splitting(self):
        drive_start = datetime(2026, 5, 10, 22, 0)
        drive_end = datetime(2026, 5, 11, 2, 0)
        stops = [Stop('start', LOC, drive_start, drive_start, 0, 'off_duty', 0, '')]
        segments = [DrivingSegment(drive_start, drive_end, 4.0, 220, LOC, LOC)]
        logs = generate_daily_logs(stops, segments, drive_start, cycle_used_at_start=0)
        self.assertEqual(len(logs), 2)
        self.assertAlmostEqual(logs[0]['totals']['driving'], 2.0, places=1)
        self.assertAlmostEqual(logs[1]['totals']['driving'], 2.0, places=1)


class TestRecapComputation(TestCase):
    def test_day1_recap_includes_cycle_used(self):
        stops = [
            Stop('start', LOC, START, START, 0, 'off_duty', 0, ''),
            Stop('dropoff', LOC, START + timedelta(hours=5), START + timedelta(hours=6),
                 1.0, 'on_duty_not_driving', 300, ''),
        ]
        segments = [DrivingSegment(START, START + timedelta(hours=5), 5.0, 300, LOC, LOC)]
        logs = generate_daily_logs(stops, segments, START, cycle_used_at_start=20)
        recap = logs[0]['recap_70hr']
        self.assertAlmostEqual(recap['a_total_on_duty_7_days'], 26.0, places=0)
        self.assertAlmostEqual(recap['b_hours_available_tomorrow'], 44.0, places=0)
