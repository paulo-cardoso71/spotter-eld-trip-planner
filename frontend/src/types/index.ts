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
