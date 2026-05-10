import axios from 'axios';
import type { TripPlanRequest, TripPlanResponse } from '../types';

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
