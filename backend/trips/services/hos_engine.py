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
    if state.cycle_remaining < 1.0:
        _insert_mandatory_rest(state, stops, geometry)

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
        if state.driving_remaining <= 0.01 or state.window_remaining <= 0.01:
            _insert_overnight_rest(state, stops, geometry)

        if state.cycle_remaining <= 0.01:
            _insert_34h_restart(state, stops, geometry)

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
            break

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

        if needs_restart:
            _insert_34h_restart(state, stops, geometry)
        elif needs_overnight:
            _insert_overnight_rest(state, stops, geometry)


def _insert_overnight_rest(state: DriverState, stops: list[Stop], geometry: dict) -> None:
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
    if state.cycle_remaining <= 0.01:
        _insert_34h_restart(state, stops, geometry)
    else:
        _insert_overnight_rest(state, stops, geometry)
