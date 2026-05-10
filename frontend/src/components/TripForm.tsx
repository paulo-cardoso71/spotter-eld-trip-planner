import { Box, TextField, Typography, Alert, Card, CardContent, Divider } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MyLocationIcon from '@mui/icons-material/MyLocation';
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
    <Card sx={{
      borderRadius: 3,
      boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      overflow: 'visible',
    }}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{
            bgcolor: '#1a237e', borderRadius: 2, p: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
          }}>
            <LocalShippingIcon sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2, fontSize: '1.1rem' }}>Trip Details</Typography>
            <Typography variant="caption" color="text.secondary">Enter your route information</Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {error && (<Alert severity="error" onClose={onDismissError} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>)}

        {/* Route section label */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <MyLocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
            Route
          </Typography>
        </Box>

        <LocationAutocomplete label="Current Location" value={currentLocation} onChange={onCurrentLocationChange} />
        <LocationAutocomplete label="Pickup Location" value={pickupLocation} onChange={onPickupLocationChange} />
        <LocationAutocomplete label="Dropoff Location" value={dropoffLocation} onChange={onDropoffLocationChange} />

        <Divider sx={{ my: 2 }} />

        <TextField
          label="Current Cycle Used (hours)" type="number" value={cycleUsed}
          onChange={(e) => { const val = parseFloat(e.target.value) || 0; onCycleUsedChange(Math.min(70, Math.max(0, val))); }}
          inputProps={{ min: 0, max: 70, step: 0.5 }}
          size="small" fullWidth
          helperText="Hours used in current 70h/8-day cycle (0-70)"
          sx={{ mb: 3 }}
        />
        <LoadingButton
          variant="contained" fullWidth size="large" loading={loading} onClick={onSubmit}
          disabled={!currentLocation || !pickupLocation || !dropoffLocation}
          sx={{
            bgcolor: '#ff6d00', py: 1.5, fontSize: '1rem', fontWeight: 700,
            borderRadius: 2, boxShadow: '0 4px 12px rgba(255,109,0,0.3)',
            '&:hover': { bgcolor: '#e65100', boxShadow: '0 6px 16px rgba(255,109,0,0.4)' },
            '&.Mui-disabled': { bgcolor: '#ccc' },
          }}
        >
          Plan Trip
        </LoadingButton>
      </CardContent>
    </Card>
  );
}
