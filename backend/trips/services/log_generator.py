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
    timeline = _build_timeline(stops, driving_segments, start_time)
    if not timeline:
        return []

    first_day = timeline[0]['start'].date()
    last_end = timeline[-1]['end']
    # If the timeline ends exactly at midnight, the last meaningful day is the previous date
    if last_end.hour == 0 and last_end.minute == 0 and last_end.second == 0:
        last_day = (last_end - timedelta(days=1)).date()
    else:
        last_day = last_end.date()
    daily_logs = []
    current_date = first_day

    while current_date <= last_day:
        day_start = datetime.combine(current_date, time(0, 0))
        day_end = datetime.combine(current_date + timedelta(days=1), time(0, 0))
        entries = []
        remarks = []
        day_miles = 0.0

        for seg in timeline:
            if seg['end'] <= day_start or seg['start'] >= day_end:
                continue
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

            if seg['status'] == 'driving' and seg.get('miles', 0) > 0:
                seg_total_hours = (seg['end'] - seg['start']).total_seconds() / 3600
                if seg_total_hours > 0:
                    fraction = (end_hour - start_hour) / seg_total_hours
                    day_miles += seg['miles'] * fraction

            if seg['start'].date() == current_date and seg.get('notes'):
                time_str = seg['start'].strftime('%H:%M')
                remarks.append(f"{time_str} — {seg['notes']}")

        totals = {
            'off_duty': 0.0, 'sleeper_berth': 0.0,
            'driving': 0.0, 'on_duty_not_driving': 0.0,
        }
        for entry in entries:
            totals[entry['status']] += entry['end_hour'] - entry['start_hour']
        for key in totals:
            totals[key] = round(totals[key], 2)

        from_city = _get_city_for_day(stops, driving_segments, current_date, 'start')
        to_city = _get_city_for_day(stops, driving_segments, current_date, 'end')
        recap = _compute_recap(stops, driving_segments, current_date, cycle_used_at_start, first_day)

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


def _build_timeline(stops, driving_segments, start_time):
    events = []
    for seg in driving_segments:
        events.append({
            'start': seg.start_time, 'end': seg.end_time,
            'status': 'driving', 'miles': seg.miles, 'notes': '',
        })
    for stop in stops:
        if stop.type == 'start' or stop.duration_hours <= 0:
            continue
        events.append({
            'start': stop.arrival_time, 'end': stop.departure_time,
            'status': stop.duty_status, 'miles': 0, 'notes': stop.notes,
        })
    events.sort(key=lambda e: e['start'])
    if not events:
        return []

    filled = []
    trip_start = datetime.combine(events[0]['start'].date(), time(0, 0))
    trip_end_day = datetime.combine(events[-1]['end'].date() + timedelta(days=1), time(0, 0))

    if events[0]['start'] > trip_start:
        filled.append({'start': trip_start, 'end': events[0]['start'], 'status': 'off_duty', 'miles': 0, 'notes': ''})

    for i, event in enumerate(events):
        if i > 0:
            prev_end = events[i - 1]['end']
            if event['start'] > prev_end + timedelta(seconds=1):
                filled.append({'start': prev_end, 'end': event['start'], 'status': 'off_duty', 'miles': 0, 'notes': ''})
        filled.append(event)

    if events[-1]['end'] < trip_end_day:
        filled.append({'start': events[-1]['end'], 'end': trip_end_day, 'status': 'off_duty', 'miles': 0, 'notes': ''})

    return filled


def _hours_since_midnight(dt):
    return dt.hour + dt.minute / 60 + dt.second / 3600


def _get_city_for_day(stops, segments, date, position):
    all_events = []
    for s in stops:
        all_events.append((s.arrival_time, s.location.address))
    for seg in segments:
        all_events.append((seg.start_time, seg.start_location.address))
        all_events.append((seg.end_time, seg.end_location.address))

    day_events = [(t, addr) for t, addr in all_events if t.date() == date and addr]
    if not day_events:
        before = [(t, addr) for t, addr in all_events if t.date() < date and addr]
        if before:
            return before[-1][1]
        return ''
    day_events.sort(key=lambda x: x[0])
    return day_events[0][1] if position == 'start' else day_events[-1][1]


def _compute_recap(stops, segments, current_date, cycle_used_at_start, trip_start_date):
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

    last_restart_date = None
    for stop in stops:
        if stop.type == 'restart_34h' and stop.departure_time.date() <= current_date:
            last_restart_date = stop.departure_time.date()

    if last_restart_date:
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
