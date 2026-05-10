import { useState, useCallback } from 'react';
import type { LocationInput, TripPlanResponse } from '../types';
import { planTrip } from '../services/api';

interface FormState {
  currentLocation: LocationInput | null;
  pickupLocation: LocationInput | null;
  dropoffLocation: LocationInput | null;
  cycleUsed: number;
}

export function useTripPlanner() {
  const [form, setForm] = useState<FormState>({
    currentLocation: null, pickupLocation: null, dropoffLocation: null, cycleUsed: 0,
  });
  const [result, setResult] = useState<TripPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCurrentLocation = useCallback((loc: LocationInput | null) => {
    setForm((prev) => ({ ...prev, currentLocation: loc }));
  }, []);
  const setPickupLocation = useCallback((loc: LocationInput | null) => {
    setForm((prev) => ({ ...prev, pickupLocation: loc }));
  }, []);
  const setDropoffLocation = useCallback((loc: LocationInput | null) => {
    setForm((prev) => ({ ...prev, dropoffLocation: loc }));
  }, []);
  const setCycleUsed = useCallback((hours: number) => {
    setForm((prev) => ({ ...prev, cycleUsed: hours }));
  }, []);

  const submitTrip = useCallback(async () => {
    if (!form.currentLocation || !form.pickupLocation || !form.dropoffLocation) {
      setError('All locations are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await planTrip({
        current_location: form.currentLocation,
        pickup_location: form.pickupLocation,
        dropoff_location: form.dropoffLocation,
        current_cycle_used: form.cycleUsed,
      });
      setResult(response);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Failed to plan trip. Please try again.');
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [form]);

  return { form, result, loading, error, setCurrentLocation, setPickupLocation, setDropoffLocation, setCycleUsed, submitTrip, setError };
}
