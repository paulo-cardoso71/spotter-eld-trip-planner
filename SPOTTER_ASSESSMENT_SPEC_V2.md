# ELD Trip Planner — Full Stack Assessment Spec (V2)
## Spotter AI — Full Stack Developer Position

> **V2.1 Changelog vs V2:**
> - Separated `stops` (map markers) from `driving_segments` (log timeline) in API response
> - Fixed 70h recap: Day 1 column A = current_cycle_used + on_duty_today; handles 34h restart reset
> - Added reverse geocoding with caching for "City, ST" stop labels
> - Added fuel cost estimate formula: total_miles / 6.5 * 3.80
>
> **V2 Changelog vs V1:**
> - Fixed 70h cycle exhaustion infinite loop — 34h restart is now baseline
> - Fixed pickup/dropoff cycle availability check
> - Updated 30-min break rule to current FMCSA (2020+) — any non-driving ≥30min qualifies
> - Added single Mapbox waypoint route (replaces two separate calls)
> - Added stop geolocation via route interpolation
> - Added explicit midnight-splitting logic for daily logs
> - Added Django model definitions
> - Added SVG log sheet details matching official FMCSA form (from reference image)
> - Added 70h/8-day recap table as baseline (moved from over-delivery)
> - Added timezone handling strategy

---

## OBJECTIVE

Build a full-stack application (Django + React) that takes truck trip details as inputs and outputs:
1. **Route on a map** with mandatory stops (rest, fuel, pickup, dropoff)
2. **Daily Log Sheets (ELD)** visually drawn and filled out following the FMCSA format

---

## ARCHITECTURE

```
Frontend (React 18+ / Vite / TypeScript / MUI v5+)
  ├── TripForm            — trip inputs with geocoding autocomplete
  ├── LocationAutocomplete — Mapbox Geocoding with debounce
  ├── RouteMap            — Mapbox GL JS map with route polyline + stop markers
  ├── TripSummary         — trip overview cards (distance, time, stops, fuel cost)
  ├── StopTimeline        — chronological list of all stops (clickable → map pan)
  ├── LogSheet            — SVG component drawing ONE FMCSA daily log grid
  ├── LogSheetList        — renders one LogSheet per day of the trip
  └── services/api.ts     — axios client for backend

Backend (Django 5+ / DRF / Python 3.12+)
  ├── POST /api/trip-plan/       — receives inputs, returns route + HOS stops + logs
  ├── GET  /api/trip-plan/{id}/  — retrieves saved plan
  └── Internal services:
       ├── route_service.py    — Mapbox Directions API (single waypoint route)
       ├── hos_engine.py       — HOS rules engine, calculates all mandatory stops
       └── log_generator.py    — converts stops timeline into daily log sheets
```

---

## INPUTS (Form)

| Field | Type | Notes |
|-------|------|-------|
| Current Location | Autocomplete (geocoding) | Mapbox Geocoding API |
| Pickup Location | Autocomplete (geocoding) | |
| Dropoff Location | Autocomplete (geocoding) | |
| Current Cycle Used | Number (hours, 0.5 step) | 0–70, hours already used in the 70h/8-day cycle |

### UX Requirements (baseline):
- Autocomplete powered by Mapbox Geocoding API (debounce 300ms)
- Inline validation:
  - Cycle used: 0–70 range
  - All locations required
  - Locations must be distinct
- "Plan Trip" button with loading state (MUI LoadingButton)
- Clear error messages via MUI Alert
- Responsive: sidebar on desktop, stacked on mobile

### Over-delivery UX:
- "Use My Location" button with browser Geolocation API
- Swap pickup/dropoff button
- Recent trips history (from saved plans)

---

## OUTPUTS

### 1. Route Map (Mapbox GL JS via react-map-gl)

**Baseline:**
- Full route drawn as polyline from Mapbox Directions API (real roads, NOT straight lines)
- **Single API call with waypoints:** `current → pickup → dropoff` (not two separate calls)
- Markers differentiated by stop type with distinct colors/icons:
  - 🟢 Start (current location) — green
  - 📦 Pickup — orange
  - 📦 Dropoff — red
  - ⛽ Fuel Stop — yellow
  - 🛑 Rest Stop / 30min break — blue
  - 🏨 Overnight Rest / 10h off-duty — purple
  - ⏸️ 34h Restart — dark purple
  - 🏁 Final destination — green checkered
- Clickable markers with popups: stop type, arrival time, departure time, duration, notes
- Map auto-fits bounds to show the entire route
- Stop locations placed at actual geographic points along the route (see "Stop Geolocation" below)

**Over-delivery:**
- Route draws progressively with animation
- Click a stop in StopTimeline → map pans/zooms to that marker (bidirectional linking)
- Color-coded route segments by duty status (driving = green, off-duty gap = gray dashed)

### 2. Daily Log Sheets (ELD) — MOST IMPORTANT COMPONENT

Each day of the trip generates one log sheet. The log sheet must be **visually drawn replicating the official FMCSA Driver's Daily Log** form.

#### Reference: Official FMCSA Form (from image.png)

The SVG must replicate this structure:

```
┌─────────────────────────────────────────────────────────────────────┐
│  DRIVER'S DAILY LOG                    Original - File at terminal  │
│  (24 hours)        ___/___/___         Duplicate - Driver retains   │
│                    month day  year      for 8 days                  │
├─────────────────────────────────────────────────────────────────────┤
│  From: ___________________    To: ___________________              │
├─────────────────────────────────────────────────────────────────────┤
│  Total Miles Driving │ Name of Carrier or Carriers                  │
│  Total Mileage Today │ Main Office Address                          │
│  Truck/Tractor #     │ Home Terminal Address                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     Mid-                                              Mid-   Total  │
│     night  1  2  3  4  5  6  7  8  9 10 11 Noon 1  2  3  4  5  6  7  8  9 10 11 night  Hours │
│  1. Off Duty      ████████░░░░░░░░░░░░░░░░░░░░░░░░░░████████  10.0 │
│  2. Sleeper Berth ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0.0 │
│  3. Driving       ░░░░░░░░████████████████░░████████░░░░░░░░   9.0 │
│  4. On Duty       ░░░░░░░░░░░░░░░░░░░░░░██░░░░░░░░██████░░░   5.0 │
│     (not driving)                                      Total: 24.0 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  REMARKS                                                            │
│  ● 08:00 — Depart Chicago, IL                                      │
│  ● 11:00 — Arrive Indianapolis, IN (pickup)                        │
│  ● 12:00 — Depart Indianapolis, IN                                 │
│  ● ...                                                              │
├─────────────────────────────────────────────────────────────────────┤
│  SHIPPING DOCUMENTS                                                 │
│  DVL or Manifest No: ___________                                    │
│  Shipper & Commodity: ___________                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Enter name of place you reported and where released from work      │
│  and when and where each change of duty occurred.                   │
│  Use time standard of home terminal.                                │
├─────────────────────────────────────────────────────────────────────┤
│  RECAP:  70 Hour / 8 Day                                           │
│  ┌──────────────────────────────┐   *If you took 34 consecutive    │
│  │       A.        B.       C.  │    hours off duty you have       │
│  │  Total hrs   Total hrs  Total│    60/70 hours available         │
│  │  on duty     available  hrs  │                                  │
│  │  last 7 days tomorrow  on    │                                  │
│  │  incl today  (70-A*)   duty  │                                  │
│  │              	         last 3│                                  │
│  │                        days  │                                  │
│  │                        incl  │                                  │
│  │                        today │                                  │
│  └──────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Grid Structure (24 hours):

- **X-axis:** 24 hours, midnight to midnight
  - Major gridlines every hour (solid, 1px, dark gray)
  - Minor gridlines every 15 minutes (dashed/dotted, 0.5px, light gray)
  - Labels: "Midnight", 1–11, "Noon", 1–11, "Midnight"
- **Y-axis:** 4 duty status rows (equal height, ~40px each):
  1. Off Duty
  2. Sleeper Berth
  3. Driving
  4. On Duty (not driving)
- **Active periods:** Filled `<rect>` elements with solid color per status
- **Vertical transition lines:** `<line>` elements connecting the departing row to the arriving row when status changes — **THIS IS WHAT MAKES IT LOOK AUTHENTIC**
- **Total Hours column** on the right of each row (1 decimal place)
- **Grand total** at bottom-right must equal exactly **24.0**

#### Log Sheet Fields (baseline — all of these):

| Section | Fields | Source |
|---------|--------|--------|
| Header | Date, "Driver's Daily Log (24 hours)" | Generated |
| Route | From city / To city | First and last city of that day |
| Metrics | Total Miles Driving Today | Sum of driving miles that day |
| Carrier | Name of Carrier, Main Office Address | Placeholder / user input |
| Vehicle | Truck/Tractor #, Trailer #, License Plate/State | Placeholder |
| Grid | SVG grid with filled bars + vertical transitions | Computed |
| Totals | Hours per status row (must sum to 24.0) | Computed |
| Remarks | Timestamped notes: departures, arrivals, duty changes | From stops |
| Shipping | DVL or Manifest No., Shipper & Commodity | Placeholder |
| Recap | 70-Hour/8-Day table (A: total on-duty last 7 days, B: available tomorrow, C: on-duty last 3 days) | Computed |
| Note | "Use time standard of home terminal" | Static text |

#### Over-delivery log features:
- PDF export of all log sheets (jsPDF + svg2pdf.js)
- Print-ready layout (@media print CSS)
- Editable placeholder fields (driver name, carrier, truck #)

#### SVG Implementation Details:

```
SVG viewBox: "0 0 900 600" (landscape, print-friendly aspect ratio)

Layout (top to bottom):
  y=0-60:    Header (title, date, from/to)
  y=60-100:  Metrics row (miles, carrier, vehicle)
  y=100-340: Grid area
    y=100-110:   Time labels (Midnight, 1, 2, ... Noon, ... Midnight)
    y=110-150:   Row 1: Off Duty
    y=150-190:   Row 2: Sleeper Berth
    y=190-230:   Row 3: Driving
    y=230-270:   Row 4: On Duty (not driving)
    y=270-280:   Row labels + total hours
    x=60-840:    24-hour span (780px = 32.5px per hour)
    x=850-900:   Total Hours column
  y=280-400: Remarks section
  y=400-460: Shipping Documents section
  y=460-560: Recap table (70hr/8day)
  y=560-600: Footer note

Colors:
  Off Duty fill:      #4CAF50 (green)
  Sleeper Berth fill:  #9C27B0 (purple)
  Driving fill:        #2196F3 (blue)
  On Duty fill:        #FF9800 (orange)
  Grid lines (major):  #333333, 1px solid
  Grid lines (minor):  #CCCCCC, 0.5px dashed
  Transition lines:    #000000, 2px solid
  Background:          #FFFFFF
```

---

## HOS RULES ENGINE (BACKEND CORE)

### Assessment Assumptions:
- Property-carrying driver (interstate)
- Cycle: **70 hours / 8 days**
- NO adverse driving conditions
- Fueling at least once every **1,000 miles**
- **1 hour** for pickup (On Duty, Not Driving)
- **1 hour** for dropoff (On Duty, Not Driving)

### FMCSA HOS Rules (49 CFR Part 395) — April 2022 Edition:

#### Rule 1: 11-Hour Driving Limit
- Max 11 hours of DRIVING after 10 consecutive hours off-duty
- Only actual driving time counts (not on-duty-not-driving)

#### Rule 2: 14-Hour Driving Window
- Cannot DRIVE beyond the 14th consecutive hour after coming on-duty
- This clock does **NOT** pause for breaks, fuel stops, or on-duty-not-driving time
- Resets **only** after 10 consecutive hours off-duty
- Example: come on-duty at 6AM → cannot drive after 8PM regardless of breaks taken

#### Rule 3: 30-Minute Break (UPDATED — 2020 Rule)
- Required after **8 cumulative hours of DRIVING** (not 8h of on-duty)
- Can be satisfied by **any 30 consecutive minutes of non-driving time**:
  - Off Duty ✅
  - Sleeper Berth ✅
  - On Duty Not Driving ✅ (e.g., a fuel stop counts!)
- Resets the 8-hour driving-since-break counter
- **Implication:** A fuel stop ≥ 30 min doubles as the mandatory break

#### Rule 4: 70-Hour/8-Day Limit
- Cannot be ON DUTY after 70 hours on-duty in 8 consecutive days
- Both driving AND on-duty-not-driving count toward the 70h
- Available hours = 70 - current_cycle_used
- Pickup (1h) and dropoff (1h) consume cycle hours
- Fuel stops (on-duty-not-driving) consume cycle hours
- Off-duty time does NOT consume cycle hours

#### Rule 5: 10-Hour Off-Duty Between Shifts
- 10 consecutive hours off-duty required between shifts
- Resets BOTH the 11h driving limit AND the 14h window
- Does **NOT** reset the 70h/8-day cycle

#### Rule 6: 34-Hour Restart (BASELINE — promoted from over-delivery)
- 34 consecutive hours off-duty resets the 70h cycle to zero
- Required when cycle_remaining reaches 0 (otherwise trip cannot continue)
- This is **mandatory for algorithm correctness** — without it, any trip exhausting the 70h cycle causes an infinite loop

### Stop Geolocation Strategy:

The algorithm computes *when* a stop occurs (by hours/miles driven). To find *where* on the route:

1. Calculate the cumulative distance at the stop point
2. Walk the route geometry's coordinate array, summing segment distances
3. When cumulative distance reaches the stop distance, interpolate between the two bracketing coordinates
4. Reverse-geocode the resulting lat/lng to get a "City, ST" label

**Implementation:** Use Python's `shapely` library or manual haversine interpolation on the backend. On the frontend, `@turf/along` can validate.

### Reverse Geocoding for "City, ST" Labels:

After interpolating a stop's lat/lng along the route, we need a human-readable "City, ST" label for log sheets and map popups.

- Use **Mapbox Reverse Geocoding API**: `GET /geocoding/v5/mapbox.places/{lng},{lat}.json?types=place`
- Extract `place_name` → parse to "City, ST" format
- **Cache results** using Django's cache framework (or a simple dict in-memory during request):
  - Key: rounded lat/lng (2 decimal places — ~1.1km precision)
  - TTL: permanent (city names don't change)
  - This prevents redundant API calls for stops near each other

```python
# services/route_service.py
from functools import lru_cache

@lru_cache(maxsize=256)
def reverse_geocode(lat: float, lng: float) -> str:
    """Returns 'City, ST' for a given coordinate. Cached."""
    rounded_lat = round(lat, 2)
    rounded_lng = round(lng, 2)
    response = mapbox_reverse_geocode(rounded_lat, rounded_lng)
    # Parse response to extract "City, ST"
    return parse_city_state(response)
```

### Fuel Cost Estimate:

Simple formula using industry averages:

```
fuel_cost = total_miles / 6.5 * 3.80

Where:
  6.5 = average truck MPG (Class 8 semi-truck)
  3.80 = average US diesel price per gallon ($/gal)
```

This is displayed in the Trip Summary cards. Values can be made configurable later but hardcoded defaults are fine for the assessment.

### Trip Simulation Algorithm (V2 — FIXED):

```python
def calculate_trip_plan(current_loc, pickup_loc, dropoff_loc, cycle_used):
    """
    Main entry point. Returns route geometry, stops list, and daily logs.
    """

    # ─── Step 1: Fetch single route with waypoints ───
    route = mapbox_directions(
        waypoints=[current_loc, pickup_loc, dropoff_loc],
        profile="driving"  # or "driving-traffic" for over-delivery
    )
    # route.legs[0] = current → pickup (distance_A, duration_A)
    # route.legs[1] = pickup → dropoff (distance_B, duration_B)
    # route.geometry = full LineString for entire route

    leg_A = route.legs[0]  # {distance_miles, duration_hours}
    leg_B = route.legs[1]

    # ─── Step 2: Initialize driver state ───
    state = DriverState(
        driving_remaining    = 11.0,   # hours left to drive this shift
        window_remaining     = 14.0,   # hours left in 14h window
        driving_since_break  = 0.0,    # driving hours since last qualifying break
        cycle_remaining      = 70.0 - cycle_used,
        miles_since_fuel     = 0.0,
        current_time         = now(),  # e.g., today 08:00 local
        cumulative_miles     = 0.0,    # for geolocation along route
    )
    stops = []              # actual stops (fuel, rest, pickup, dropoff, overnight, restart)
    driving_segments = []   # driving periods (for log timeline, NOT map markers)

    # ─── Step 3: Drive to pickup ───
    simulate_driving(state, stops, driving_segments, leg_A.distance, leg_A.duration, route.geometry)

    # ─── Step 4: Pickup (1h on-duty-not-driving) ───
    # FIX: Check cycle availability BEFORE deducting
    if state.cycle_remaining < 1.0:
        insert_mandatory_rest(state, stops)  # 10h or 34h depending on cycle

    stops.append(Stop(
        type="pickup",
        duration=1.0,
        duty_status="on_duty_not_driving",
        location=pickup_loc,
    ))
    state.window_remaining -= 1.0
    state.cycle_remaining  -= 1.0
    state.current_time     += 1.0

    # FIX: Pickup counts as non-driving time ≥ 30min? No, it's 60min.
    # Under 2020 rules, 1h of on-duty-not-driving satisfies the 30min break.
    if state.driving_since_break > 0:
        state.driving_since_break = 0  # 1h non-driving resets the break clock

    # ─── Step 5: Drive to dropoff ───
    simulate_driving(state, stops, driving_segments, leg_B.distance, leg_B.duration, route.geometry)

    # ─── Step 6: Dropoff (1h on-duty-not-driving) ───
    if state.cycle_remaining < 1.0:
        insert_mandatory_rest(state, stops)

    stops.append(Stop(
        type="dropoff",
        duration=1.0,
        duty_status="on_duty_not_driving",
        location=dropoff_loc,
    ))
    state.current_time += 1.0

    # ─── Step 7: Generate daily logs from COMBINED timeline ───
    # The log generator needs both stops and driving_segments merged chronologically
    timeline = sorted(stops + driving_segments, key=lambda s: s.arrival_time)
    daily_logs = generate_daily_logs(timeline, state, cycle_used)

    return TripPlan(
        route=route,
        stops=stops,                # for map markers (no driving segments)
        driving_segments=driving_segments,  # for log timeline
        daily_logs=daily_logs,
    )


def simulate_driving(state, stops, driving_segments, total_miles, total_hours, geometry):
    """
    Simulates driving a leg, inserting mandatory stops as limits are reached.
    """
    remaining_miles = total_miles
    remaining_hours = total_hours
    avg_speed = total_miles / total_hours if total_hours > 0 else 55.0

    while remaining_miles > 0.01:  # small epsilon to avoid float issues

        # ─── Before driving: check if we CAN drive at all ───
        if state.driving_remaining <= 0 or state.window_remaining <= 0:
            insert_overnight_rest(state, stops)

        if state.cycle_remaining <= 0:
            insert_34h_restart(state, stops)  # FIX: 34h restart, not 10h rest

        # ─── Calculate max driveable segment ───
        max_drive_hours = min(
            state.driving_remaining,
            state.window_remaining,
            8.0 - state.driving_since_break,    # 30-min break trigger
            state.cycle_remaining,
            (1000 - state.miles_since_fuel) / avg_speed,  # fuel trigger
            remaining_hours,
        )

        # Safety: if max_drive_hours <= 0 after rests, something is wrong
        if max_drive_hours <= 0:
            break  # shouldn't happen after proper rest insertion

        # ─── Drive the segment ───
        miles_covered = max_drive_hours * avg_speed
        state.cumulative_miles     += miles_covered
        state.driving_remaining    -= max_drive_hours
        state.window_remaining     -= max_drive_hours
        state.driving_since_break  += max_drive_hours
        state.cycle_remaining      -= max_drive_hours
        state.miles_since_fuel     += miles_covered
        state.current_time         += max_drive_hours
        remaining_miles            -= miles_covered
        remaining_hours            -= max_drive_hours

        # Record driving segment (separate list — NOT in stops)
        drive_location = interpolate_along_route(geometry, state.cumulative_miles)
        driving_segments.append(DrivingSegment(
            start_time=state.current_time - max_drive_hours,
            end_time=state.current_time,
            duration=max_drive_hours,
            duty_status="driving",
            start_location=interpolate_along_route(geometry, state.cumulative_miles - miles_covered),
            end_location=drive_location,
            miles=miles_covered,
        ))

        if remaining_miles <= 0.01:
            break

        # ─── Determine which stop to insert ───

        # Priority 1: Fuel stop (every 1,000 miles)
        needs_fuel = state.miles_since_fuel >= 999.9

        # Priority 2: 30-min break (after 8h driving)
        needs_break = state.driving_since_break >= 7.99

        # Priority 3: Shift exhausted (11h driving or 14h window)
        needs_overnight = (state.driving_remaining <= 0.01 or
                          state.window_remaining <= 0.01)

        # Priority 4: Cycle exhausted (70h)
        needs_restart = state.cycle_remaining <= 0.01

        if needs_fuel:
            stop_location = interpolate_along_route(geometry, state.cumulative_miles)
            fuel_duration = 0.5  # 30 minutes

            stops.append(Stop(
                type="fuel_stop",
                duration=fuel_duration,
                duty_status="on_duty_not_driving",
                location=stop_location,
            ))
            state.miles_since_fuel = 0
            state.window_remaining -= fuel_duration
            state.cycle_remaining  -= fuel_duration
            state.current_time     += fuel_duration

            # FIX (2020 rule): Fuel stop ≥ 30min counts as break
            if fuel_duration >= 0.5 and needs_break:
                state.driving_since_break = 0
                needs_break = False  # satisfied by fuel stop

        if needs_break:
            # Only insert separate break if NOT already satisfied by fuel stop
            stop_location = interpolate_along_route(geometry, state.cumulative_miles)
            stops.append(Stop(
                type="rest_break",
                duration=0.5,
                duty_status="off_duty",
                location=stop_location,
            ))
            state.driving_since_break = 0
            state.window_remaining -= 0.5  # 14h window does NOT pause
            state.current_time     += 0.5
            # Off-duty: does NOT consume cycle_remaining

        if needs_restart:
            insert_34h_restart(state, stops)
        elif needs_overnight:
            insert_overnight_rest(state, stops)


def insert_overnight_rest(state, stops):
    """10h off-duty rest. Resets 11h driving + 14h window. Does NOT reset 70h cycle."""
    stop_location = interpolate_along_route(...)
    stops.append(Stop(
        type="overnight_rest",
        duration=10.0,
        duty_status="off_duty",
        location=stop_location,
    ))
    state.driving_remaining   = 11.0
    state.window_remaining    = 14.0
    state.driving_since_break = 0.0
    state.current_time       += 10.0
    # cycle_remaining is UNCHANGED


def insert_34h_restart(state, stops):
    """34h off-duty restart. Resets EVERYTHING including 70h cycle."""
    stop_location = interpolate_along_route(...)
    stops.append(Stop(
        type="restart_34h",
        duration=34.0,
        duty_status="off_duty",
        location=stop_location,
    ))
    state.driving_remaining   = 11.0
    state.window_remaining    = 14.0
    state.driving_since_break = 0.0
    state.cycle_remaining     = 70.0  # FULL RESET
    state.current_time       += 34.0


def insert_mandatory_rest(state, stops):
    """Called before pickup/dropoff when cycle is insufficient.
       Decides between 10h rest (if just shift-exhausted) or 34h restart (if cycle-exhausted)."""
    if state.cycle_remaining <= 0.01:
        insert_34h_restart(state, stops)
    else:
        insert_overnight_rest(state, stops)
```

### Algorithm Edge Cases Handled:

| Scenario | V1 Behavior | V2 Fix |
|----------|-------------|--------|
| 70h cycle runs out mid-trip | Infinite loop (10h rest doesn't reset cycle) | Insert 34h restart, resets cycle to 70h |
| Pickup when cycle < 1h | HOS violation (cycle goes negative) | Check + rest/restart before pickup |
| Dropoff when cycle < 1h | Same | Same fix |
| Fuel stop at exact 8h driving mark | Double stop (fuel + separate break) | Fuel stop ≥ 30min satisfies break under 2020 rules |
| 14h window expires before 11h driving | Driver stranded | Insert overnight rest when window ≤ 0 |
| Float precision (7.999h vs 8.0h) | Missed triggers | Use epsilon comparisons (≥ 7.99, ≤ 0.01) |
| Trip completable without any stops | No stops inserted | Works naturally (max_hours = remaining_hours) |

---

## DAILY LOG GENERATION (V2 — FIXED)

```python
def generate_daily_logs(stops, final_state):
    """
    Converts the linear stops timeline into calendar-day log sheets.

    Key insight: The stops timeline is continuous (driver's journey from start
    to finish). We must SLICE it by midnight boundaries to produce one log
    per calendar day.
    """

    # ─── Step 1: Build a continuous timeline of duty status segments ───
    # Each segment: {start_time (datetime), end_time (datetime), status, notes}
    timeline = build_timeline_from_stops(stops)

    # ─── Step 2: Determine date range ───
    first_day = timeline[0].start_time.date()
    last_day  = timeline[-1].end_time.date()

    # ─── Step 3: For each calendar day, slice the timeline ───
    daily_logs = []
    current_date = first_day

    while current_date <= last_day:
        day_start = datetime(current_date, 0, 0, 0)  # midnight start
        day_end   = datetime(current_date, 23, 59, 59)  # midnight end

        day_entries = []
        day_remarks = []
        day_miles   = 0.0

        for segment in timeline:
            # Skip segments entirely outside this day
            if segment.end_time <= day_start or segment.start_time >= day_end + 1:
                continue

            # ─── MIDNIGHT SPLITTING ───
            # Clip segment to this day's boundaries
            entry_start = max(segment.start_time, day_start)
            entry_end   = min(segment.end_time, day_end + 1)  # next midnight

            start_hour = hours_since_midnight(entry_start)  # 0.0 - 24.0
            end_hour   = hours_since_midnight(entry_end)     # 0.0 - 24.0
            if entry_end.date() > current_date:
                end_hour = 24.0  # goes to midnight

            day_entries.append({
                "start_hour": start_hour,
                "end_hour": end_hour,
                "status": segment.status,
            })

            if segment.status == "driving":
                # Proportional miles for this day's slice
                segment_fraction = (end_hour - start_hour) / segment.total_hours
                day_miles += segment.miles * segment_fraction

            # Remarks for events that START on this day
            if segment.start_time.date() == current_date and segment.notes:
                day_remarks.append(f"{format_time(segment.start_time)} — {segment.notes}")

        # ─── Step 4: Compute totals (MUST sum to 24.0) ───
        totals = {"off_duty": 0, "sleeper_berth": 0, "driving": 0, "on_duty_not_driving": 0}
        for entry in day_entries:
            totals[entry["status"]] += entry["end_hour"] - entry["start_hour"]

        total_check = sum(totals.values())
        assert abs(total_check - 24.0) < 0.01, f"Day {current_date}: totals = {total_check}"

        # ─── Step 5: Determine from/to cities ───
        from_city = get_city_at_start_of_day(stops, current_date)
        to_city   = get_city_at_end_of_day(stops, current_date)

        # ─── Step 6: Compute 70h recap ───
        recap = compute_70h_recap(stops, current_date)

        daily_logs.append(DailyLog(
            date=current_date,
            day_number=len(daily_logs) + 1,
            from_city=from_city,
            to_city=to_city,
            total_miles_today=round(day_miles, 1),
            entries=day_entries,
            totals=totals,
            remarks=day_remarks,
            recap_70hr=recap,
        ))

        current_date += timedelta(days=1)

    return daily_logs


def compute_70h_recap(timeline, current_date, cycle_used_at_start, trip_start_date):
    """
    Computes the 70-Hour/8-Day recap table for the FMCSA log.

    Matches the official form columns:
      A. Total hours on duty last 7 days including today
      B. Total hours available tomorrow (70 - A)
      C. Total hours on duty last 3 days including today

    KEY: On Day 1, column A = current_cycle_used (pre-trip) + on_duty_hours_today.
    On subsequent days, accumulate from the trip's own data + the initial cycle_used.
    """
    # On-duty hours from the trip itself, up to and including current_date
    trip_on_duty = sum_on_duty_hours(timeline, trip_start_date, current_date)

    # Column A: pre-trip cycle hours + trip on-duty hours through today
    a_total = cycle_used_at_start + trip_on_duty

    # If a 34h restart occurred before current_date, reset the base
    # (the restart zeros the cycle, so only count on-duty AFTER the restart)
    last_restart = find_last_34h_restart_before(timeline, current_date)
    if last_restart:
        a_total = sum_on_duty_hours(timeline, last_restart.date, current_date)

    # Column B: available tomorrow
    b_available = max(0.0, 70.0 - a_total)

    # Column C: on-duty last 3 days including today
    c_3_days = sum_on_duty_hours(timeline,
        max(trip_start_date, current_date - timedelta(days=2)),
        current_date
    )
    # Add pro-rated cycle_used if within the 3-day window
    if (current_date - trip_start_date).days < 3:
        c_3_days += cycle_used_at_start

    return {
        "a_total_on_duty_7_days": round(a_total, 1),
        "b_hours_available_tomorrow": round(b_available, 1),
        "c_total_on_duty_3_days": round(c_3_days, 1),
    }
```

### Pre-trip Off-Duty Padding:

Before the trip starts, the driver's status is off-duty. If the trip starts at 08:00 on Day 1:
- Day 1 log: `00:00–08:00 = off_duty (8.0h)` is automatically inserted
- This happens because "everything not explicitly driving/on-duty/sleeper = off_duty"

### Post-trip Off-Duty Padding:

After the last stop (dropoff) on the final day:
- Remaining time until midnight = off_duty
- Example: dropoff ends at 10:47 → `10:47–24:00 = off_duty (13.22h)`

---

## DJANGO MODELS

```python
# trips/models.py
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

    current_cycle_used = models.FloatField()  # 0-70

    # Computed results (stored as JSON for simplicity)
    total_distance_miles = models.FloatField(null=True)
    total_duration_hours = models.FloatField(null=True)
    fuel_cost_estimate = models.FloatField(null=True)  # total_miles / 6.5 * 3.80
    route_geometry = models.JSONField(null=True)       # GeoJSON LineString
    stops = models.JSONField(null=True)                # actual stops (fuel, rest, pickup, etc.)
    driving_segments = models.JSONField(null=True)     # driving periods (for log timeline)
    daily_logs = models.JSONField(null=True)           # list of daily log dicts

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Trip {self.id}: {self.current_location_address} → {self.dropoff_location_address}"
```

---

## API CONTRACT (V2)

### POST /api/trip-plan/

**Request:**
```json
{
  "current_location": {
    "address": "Chicago, IL",
    "lat": 41.8781,
    "lng": -87.6298
  },
  "pickup_location": {
    "address": "Indianapolis, IN",
    "lat": 39.7684,
    "lng": -86.1581
  },
  "dropoff_location": {
    "address": "Nashville, TN",
    "lat": 36.1627,
    "lng": -86.7816
  },
  "current_cycle_used": 20.0
}
```

**Response:**
```json
{
  "id": "uuid",
  "created_at": "ISO 8601",
  "total_distance_miles": 465.2,
  "total_duration_hours": 8.5,
  "number_of_stops": 5,
  "number_of_log_days": 2,
  "fuel_cost_estimate": 272.12,
  "route": {
    "geometry": {
      "type": "LineString",
      "coordinates": [[lng, lat], ...]
    }
  },
  "stops": [
    {
      "type": "start",
      "location": { "lat": 41.8781, "lng": -87.6298, "address": "Chicago, IL" },
      "arrival_time": "2026-05-08T08:00:00-05:00",
      "departure_time": "2026-05-08T08:00:00-05:00",
      "duration_hours": 0.0,
      "duty_status": "off_duty",
      "cumulative_miles": 0.0,
      "notes": "Trip start — Chicago, IL"
    },
    {
      "type": "rest_break",
      "location": { "lat": 40.5, "lng": -87.1, "address": "Lafayette, IN" },
      "arrival_time": "...",
      "departure_time": "...",
      "duration_hours": 0.5,
      "duty_status": "off_duty",
      "cumulative_miles": 440.0,
      "notes": "30-min break (8h driving limit)"
    },
    {
      "type": "pickup",
      "location": { "lat": 39.7684, "lng": -86.1581, "address": "Indianapolis, IN" },
      "arrival_time": "...",
      "departure_time": "...",
      "duration_hours": 1.0,
      "duty_status": "on_duty_not_driving",
      "cumulative_miles": 500.0,
      "notes": "Pickup — Indianapolis, IN (1h loading)"
    },
    {
      "type": "fuel_stop",
      "location": { "lat": 38.2, "lng": -86.5, "address": "Jasper, IN" },
      "arrival_time": "...",
      "departure_time": "...",
      "duration_hours": 0.5,
      "duty_status": "on_duty_not_driving",
      "cumulative_miles": 1000.0,
      "notes": "Fuel stop (1,000 mi)"
    },
    {
      "type": "overnight_rest",
      "location": { "lat": 37.5, "lng": -86.8, "address": "Bowling Green, KY" },
      "arrival_time": "...",
      "departure_time": "...",
      "duration_hours": 10.0,
      "duty_status": "off_duty",
      "cumulative_miles": 1100.0,
      "notes": "10h off-duty rest (11h driving limit)"
    },
    {
      "type": "dropoff",
      "location": { "lat": 36.1627, "lng": -86.7816, "address": "Nashville, TN" },
      "arrival_time": "...",
      "departure_time": "...",
      "duration_hours": 1.0,
      "duty_status": "on_duty_not_driving",
      "cumulative_miles": 1465.0,
      "notes": "Dropoff — Nashville, TN (1h unloading)"
    }
  ],
  "driving_segments": [
    {
      "start_time": "2026-05-08T08:00:00-05:00",
      "end_time": "2026-05-08T16:00:00-05:00",
      "duration_hours": 8.0,
      "miles": 440.0,
      "start_location": { "lat": 41.8781, "lng": -87.6298, "address": "Chicago, IL" },
      "end_location": { "lat": 40.5, "lng": -87.1, "address": "Lafayette, IN" }
    },
    {
      "start_time": "2026-05-08T16:30:00-05:00",
      "end_time": "2026-05-08T17:36:00-05:00",
      "duration_hours": 1.1,
      "miles": 60.0,
      "start_location": { "lat": 40.5, "lng": -87.1, "address": "Lafayette, IN" },
      "end_location": { "lat": 39.7684, "lng": -86.1581, "address": "Indianapolis, IN" }
    }
  ],
  "daily_logs": [
    {
      "date": "2026-05-08",
      "day_number": 1,
      "from_city": "Chicago, IL",
      "to_city": "Bowling Green, KY",
      "total_miles_today": 380.0,
      "entries": [
        { "start_hour": 0.0,  "end_hour": 8.0,  "status": "off_duty" },
        { "start_hour": 8.0,  "end_hour": 16.0, "status": "driving" },
        { "start_hour": 16.0, "end_hour": 16.5, "status": "off_duty" },
        { "start_hour": 16.5, "end_hour": 17.6, "status": "driving" },
        { "start_hour": 17.6, "end_hour": 18.6, "status": "on_duty_not_driving" },
        { "start_hour": 18.6, "end_hour": 20.5, "status": "driving" },
        { "start_hour": 20.5, "end_hour": 21.0, "status": "on_duty_not_driving" },
        { "start_hour": 21.0, "end_hour": 24.0, "status": "off_duty" }
      ],
      "totals": {
        "off_duty": 11.5,
        "sleeper_berth": 0.0,
        "driving": 11.5,
        "on_duty_not_driving": 1.5
      },
      "remarks": [
        "08:00 — Depart Chicago, IL",
        "16:00 — 30-min rest break",
        "17:36 — Arrive Indianapolis, IN (pickup)",
        "18:36 — Depart Indianapolis, IN",
        "20:30 — Fuel stop",
        "21:00 — Begin 10h off-duty rest"
      ],
      "recap_70hr": {
        "a_total_on_duty_7_days": 33.0,
        "b_hours_available_tomorrow": 37.0,
        "c_total_on_duty_3_days": 13.0
      }
    },
    {
      "date": "2026-05-09",
      "day_number": 2,
      "from_city": "Bowling Green, KY",
      "to_city": "Nashville, TN",
      "total_miles_today": 85.0,
      "entries": [
        { "start_hour": 0.0,  "end_hour": 7.0,  "status": "off_duty" },
        { "start_hour": 7.0,  "end_hour": 8.5,  "status": "driving" },
        { "start_hour": 8.5,  "end_hour": 9.5,  "status": "on_duty_not_driving" },
        { "start_hour": 9.5,  "end_hour": 24.0, "status": "off_duty" }
      ],
      "totals": {
        "off_duty": 21.5,
        "sleeper_berth": 0.0,
        "driving": 1.5,
        "on_duty_not_driving": 1.0
      },
      "remarks": [
        "07:00 — Resume driving from Bowling Green, KY",
        "08:30 — Arrive Nashville, TN (dropoff)",
        "09:30 — Dropoff complete, trip finished"
      ],
      "recap_70hr": {
        "a_total_on_duty_7_days": 35.5,
        "b_hours_available_tomorrow": 34.5,
        "c_total_on_duty_3_days": 15.5
      }
    }
  ]
}
```

### GET /api/trip-plan/{id}/

Returns the same response structure as POST (the saved plan).

### Error Responses:

```json
// 400 Bad Request
{
  "error": "validation_error",
  "details": {
    "current_cycle_used": ["Must be between 0 and 70."]
  }
}

// 502 Bad Gateway (Mapbox failure)
{
  "error": "route_service_error",
  "message": "Unable to calculate route. Please check your locations and try again."
}
```

---

## UI / UX DESIGN

### Tech Stack:
- React 18+ (Vite)
- Material UI (MUI) v5+ — **required by job posting**
- Mapbox GL JS via `react-map-gl` v7
- TypeScript throughout
- Axios for API calls

### Layout (responsive):

**Desktop (≥ 1024px):**
```
┌──────────────────────────────────────────────────────┐
│  🚛 ELD Trip Planner              [Dark Mode Toggle] │
├────────────────┬─────────────────────────────────────┤
│                │                                      │
│  TRIP FORM     │           MAPBOX MAP                 │
│  (sidebar,     │     (route polyline + markers)       │
│   ~350px)      │                                      │
│                │                                      │
│  Current Loc   │                                      │
│  Pickup Loc    │                                      │
│  Dropoff Loc   │                                      │
│  Cycle Used    │                                      │
│                │                                      │
│ [Plan Trip]    │                                      │
│                │                                      │
│ ────────────── │                                      │
│ TRIP SUMMARY   │                                      │
│ Cards:         │                                      │
│ • Total Dist   │                                      │
│ • Total Time   │                                      │
│ • # Stops      │                                      │
│ • # Log Days   │                                      │
│ • Est Fuel $   │                                      │
│                │                                      │
├────────────────┴─────────────────────────────────────┤
│  STOP TIMELINE (horizontal scrollable)                │
│  ● Start → ● Rest → ● Pickup → ● Fuel → ● Sleep → ● Dropoff │
├──────────────────────────────────────────────────────┤
│  DAILY LOG SHEETS                     [Export PDF 📄] │
│  ┌─── Day 1 ──────────────────────────────────────┐  │
│  │  [Full SVG Log Sheet per FMCSA form]            │  │
│  └────────────────────────────────────────────────┘  │
│  ┌─── Day 2 ──────────────────────────────────────┐  │
│  │  [Full SVG Log Sheet per FMCSA form]            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Mobile (< 1024px):** Sidebar stacks above map.

### Design System:
- **Primary:** Dark navy `#1a237e`
- **Accent:** Orange `#ff6d00`
- **Success:** Green `#4CAF50`
- **Background:** `#f5f5f5` (light) / `#121212` (dark)
- **Typography:** "Plus Jakarta Sans" (headers) + "DM Sans" (body)
- **Components:** MUI Cards with subtle elevation (2-4dp), rounded corners (8px)
- **Log sheet:** White background, high contrast, official-looking

### Loading States:
- MUI Skeleton loaders for map and log sheets
- Linear progress bar under the app header during computation
- Loading spinner on "Plan Trip" button

### Error States:
- MUI Alert (severity: error) with retry action button
- Field-level validation errors inline
- Network error: "Unable to reach server. Please check your connection."

---

## OVER-DELIVERY FEATURE TABLE (PRIORITIZED)

| # | Feature | Effort | Impact | In Baseline? | Notes |
|---|---------|--------|--------|-------------|-------|
| 1 | TypeScript throughout | Med | 🔥🔥🔥 | ✅ Yes | Job posting values strong typing |
| 2 | 70h/8-day recap table on each log | Low | 🔥🔥🔥 | ✅ Yes (promoted) | Matches official FMCSA form exactly |
| 3 | 34h restart support | Low | 🔥🔥🔥 | ✅ Yes (promoted) | Required for algorithm correctness |
| 4 | Trip summary cards | Low | 🔥🔥 | ✅ Yes | Distance, duration, stops, fuel cost |
| 5 | PDF export of log sheets | Med | 🔥🔥🔥 | Over-delivery | jsPDF + svg2pdf.js. Shows production thinking |
| 6 | Responsive / mobile | Med | 🔥🔥 | Over-delivery | Stack sidebar below map on mobile |
| 7 | Print-ready CSS | Low | 🔥🔥 | Over-delivery | @media print for log sheets |
| 8 | "Use My Location" button | Low | 🔥 | Over-delivery | Browser geolocation |
| 9 | Fuel cost estimate | Low | 🔥 | Over-delivery | avg price × miles / avg MPG |
| 10 | Dark mode toggle | Low | 🔥 | Over-delivery | MUI theme switching |

**Build order:** Baseline first → then PDF export → responsive → print CSS → location button → fuel cost → dark mode

---

## TIMEZONE STRATEGY

**Approach:** Home terminal time standard (matches FMCSA requirement on the form).

- The FMCSA form states: "Use time standard of home terminal"
- For this assessment: use the **current location's timezone** as the home terminal timezone
- All times in the API response are in **ISO 8601 with timezone offset**
- The log grid always shows midnight-to-midnight in the home terminal timezone
- Cross-timezone trips: the clock doesn't shift mid-trip (per FMCSA rules)

**Implementation:**
- Backend: Use `pytz` or `zoneinfo` to determine timezone from lat/lng (via `timezonefinder` package)
- All internal calculations in the home terminal timezone
- Frontend: Display times as-is (already in correct timezone)

---

## PROJECT STRUCTURE (V2)

```
SpotterApp/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile                    # Railway deployment
│   ├── runtime.txt                 # Python version for Railway
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── trips/
│       ├── __init__.py
│       ├── models.py               # TripPlan model
│       ├── serializers.py          # DRF serializers
│       ├── views.py                # API views
│       ├── urls.py                 # /api/trip-plan/
│       ├── admin.py                # TripPlan admin
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── test_hos_engine.py  # HOS rules unit tests
│       │   ├── test_log_generator.py
│       │   └── test_views.py
│       └── services/
│           ├── __init__.py
│           ├── route_service.py    # Mapbox Directions API (single waypoint call)
│           ├── hos_engine.py       # HOS rules engine
│           └── log_generator.py    # Daily log generation
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── theme.ts                # MUI theme (dark navy + orange)
│       ├── types/index.ts          # TypeScript interfaces
│       ├── services/api.ts         # Axios API client
│       ├── hooks/
│       │   └── useTripPlanner.ts   # Main hook: form state, API call, results
│       └── components/
│           ├── TripForm.tsx
│           ├── LocationAutocomplete.tsx
│           ├── RouteMap.tsx
│           ├── TripSummary.tsx
│           ├── StopTimeline.tsx
│           ├── LogSheet.tsx         # SVG log sheet component
│           ├── LogSheetGrid.tsx     # SVG grid sub-component
│           ├── LogSheetRecap.tsx    # SVG recap table sub-component
│           └── LogSheetList.tsx     # Renders all daily logs + PDF export button
├── .gitignore
├── .env.example
└── README.md
```

---

## COMMON MISTAKES TO AVOID (V2)

1. **DO NOT draw straight lines on the map** — use Mapbox Directions API for real road geometry
2. **DO NOT forget vertical transition lines** in the log grid — `<line>` elements connecting rows vertically at status changes
3. **DO NOT ignore the 14-hour window** — it does NOT pause for breaks or on-duty time; only resets with 10h off-duty
4. **DO NOT treat the 30-min break as off-duty only** — under 2020 rules, any non-driving ≥30min works (including fuel stops)
5. **DO NOT forget pickup/dropoff = On Duty Not Driving** — they consume 14h window AND 70h cycle
6. **DO NOT forget fuel stops** — every 1,000 miles, ~30min (On Duty Not Driving)
7. **Daily log hours MUST sum to 24.0** — midnight to midnight, every minute accounted for
8. **First day doesn't start at midnight driving** — before trip start time = off_duty
9. **DO NOT make two separate Mapbox route calls** — use single call with waypoints
10. **DO NOT forget to geolocate stops** — interpolate along the route geometry, don't just use arbitrary coordinates
11. **DO NOT ignore the 70h cycle exhaustion** — must insert 34h restart when cycle hits 0
12. **DO NOT deduct cycle for pickup/dropoff without checking availability first**
13. **DO NOT forget midnight splitting** — a driving period from 22:00-02:00 must appear as two entries on two different daily logs

---

## DEPLOYMENT

### Frontend: Vercel
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_MAPBOX_TOKEN`, `VITE_API_URL`

### Backend: Railway
- Runtime: Python 3.12
- Start command: `gunicorn config.wsgi:application`
- Database: SQLite (sufficient for assessment; PostgreSQL if Railway provides it)
- Environment variables: `MAPBOX_ACCESS_TOKEN`, `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`

### CORS Configuration:
```python
# config/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",          # Vite dev server
    "https://your-app.vercel.app",    # Production frontend
]
```

### Environment Variables (.env.example):
```
# Backend
MAPBOX_ACCESS_TOKEN=pk.xxx
DJANGO_SECRET_KEY=change-me-in-production
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1,backend.railway.app
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Frontend
VITE_MAPBOX_TOKEN=pk.xxx
VITE_API_URL=http://localhost:8000/api
```

---

## TESTING STRATEGY

### Backend (pytest + Django test client):

**HOS Engine (most critical — pure logic, no I/O):**
- Short trip within all limits (no mandatory stops)
- 11h driving limit triggers overnight rest
- 14h window expires before 11h driving limit
- 30min break triggers at exactly 8h driving
- 30min fuel stop satisfies break requirement (2020 rule)
- 70h cycle exhaustion triggers 34h restart
- Pickup/dropoff cycle availability check
- Fuel stop at 1,000 mile boundary
- Multi-day trip with multiple overnight rests
- Edge: driver starts with 69.5h cycle used (barely enough for anything)

**Log Generator:**
- Single-day trip produces one log summing to 24.0
- Multi-day trip produces correct number of logs
- Midnight-crossing segment is split correctly
- Pre-trip and post-trip off-duty padding
- Recap table computes correctly

**API Views:**
- POST with valid input returns 200
- POST with invalid cycle (>70) returns 400
- GET saved plan returns correct data

### Frontend (optional but impressive):
- Log sheet SVG renders correct number of rects
- Totals sum to 24.0 on rendered log

---

## FINAL CHECKLIST (V2)

### Baseline (REQUIRED):
- [ ] Form with geocoding autocomplete (Mapbox Geocoding, debounced)
- [ ] Real route on Mapbox map (single waypoint Directions API call)
- [ ] Colored markers by stop type with popups
- [ ] Correct HOS calculations:
  - [ ] 11h driving limit
  - [ ] 14h window (doesn't pause)
  - [ ] 30min break after 8h driving (2020 rule: any non-driving ≥30min)
  - [ ] 70h/8-day cycle with 34h restart when exhausted
  - [ ] 10h off-duty resets shift but NOT cycle
  - [ ] Pickup/dropoff check cycle availability first
- [ ] Fuel stops every 1,000 miles (0.5h on-duty-not-driving)
- [ ] Fuel stop ≥ 30min satisfies break requirement
- [ ] 1h pickup + 1h dropoff as On Duty Not Driving
- [ ] Stop geolocation: markers placed at interpolated points along route
- [ ] SVG daily log sheets matching FMCSA form layout:
  - [ ] Grid with 4 status rows, 24h x-axis
  - [ ] Filled rectangles for active periods
  - [ ] Vertical transition lines between status changes
  - [ ] Total hours per row (sum to 24.0)
  - [ ] Header: date, from/to, miles
  - [ ] Remarks section with timestamped events
  - [ ] 70h/8-day recap table
  - [ ] Shipping documents section (placeholder fields)
- [ ] Midnight splitting for multi-day trips
- [ ] MUI-based polished UI with professional design
- [ ] Loading and error states
- [ ] TypeScript throughout frontend
- [ ] Backend input validation
- [ ] HOS engine unit tests
- [ ] Django model for saving/retrieving trip plans
- [ ] README.md with setup instructions
- [ ] Clean, organized code

### Over-delivery:
- [ ] PDF export of log sheets (jsPDF + svg2pdf.js)
- [ ] Responsive design (mobile-friendly)
- [ ] Print-ready CSS (@media print)
- [ ] "Use My Location" button
- [ ] Fuel cost estimate
- [ ] Dark mode toggle
- [ ] Stop timeline ↔ map bidirectional linking
- [ ] Route animation

---

## LOOM VIDEO TIPS (3-5 min)

1. **Open with live demo** — show a real trip (e.g., Chicago → Indianapolis → Nashville)
2. **Show the log sheet** — zoom in on the SVG grid, point out transition lines, recap table
3. **Show an edge case** — long trip with nearly-full cycle (e.g., 60h used) to demonstrate 34h restart
4. **Quick code walkthrough** — architecture, HOS engine (show the algorithm), SVG component
5. **Mention technical decisions** — "I used the 2020 FMCSA break rule because...", "Single Mapbox waypoint call for efficiency", "34h restart is baseline because the algorithm requires it"
6. **Close with polish** — PDF export, responsive design, dark mode
7. **End with next steps** — "With more time I'd add sleeper berth split provisions, real truck stop POI lookup, and real-time traffic integration"
