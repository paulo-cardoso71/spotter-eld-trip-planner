import { Box, TextField, Typography, Alert, Card, CardContent } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import LocationAutocomplete from './LocationAutocomplete';
import type { LocationInput } from '../types';

interface Props {
  currentLocation: LocationInput | null;
  pickupLocation: LocationInput | null;
  dropoffLocation: LocationInput | null;
  cycleUsed: number;
  loading: boolean;
  error: string | null;
  onCurrentLocationChange: (loc: LocationInput | null) => void;
  onPickupLocationChange: (loc: LocationInput | null) => void;
  onDropoffLocationChange: (loc: LocationInput | null) => void;
  onCycleUsedChange: (hours: number) => void;
  onSubmit: () => void;
  onDismissError: () => void;
}

export default function TripForm({
  currentLocation, pickupLocation, dropoffLocation, cycleUsed, loading, error,
  onCurrentLocationChange, onPickupLocationChange, onDropoffLocationChange,
  onCycleUsedChange, onSubmit, onDismissError,
}: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Trip Details</Typography>
        {error && (<Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>{error}</Alert>)}
        <LocationAutocomplete label="Current Location" value={currentLocation} onChange={onCurrentLocationChange} />
        <LocationAutocomplete label="Pickup Location" value={pickupLocation} onChange={onPickupLocationChange} />
        <LocationAutocomplete label="Dropoff Location" value={dropoffLocation} onChange={onDropoffLocationChange} />
        <TextField
          label="Current Cycle Used (hours)" type="number" value={cycleUsed}
          onChange={(e) => { const val = parseFloat(e.target.value) || 0; onCycleUsedChange(Math.min(70, Math.max(0, val))); }}
          inputProps={{ min: 0, max: 70, step: 0.5 }}
          size="small" fullWidth
          helperText="Hours used in current 70h/8-day cycle (0-70)"
          sx={{ mb: 3 }}
        />
        <LoadingButton variant="contained" fullWidth size="large" loading={loading} onClick={onSubmit}
          disabled={!currentLocation || !pickupLocation || !dropoffLocation}>
          Plan Trip
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
