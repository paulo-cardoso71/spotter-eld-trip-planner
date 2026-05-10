import { Box, Chip, Typography, Paper } from '@mui/material';
import type { TripStop } from '../types';

const STOP_COLORS: Record<string, string> = {
  start: '#4CAF50', pickup: '#FF9800', dropoff: '#f44336', fuel_stop: '#FFC107',
  rest_break: '#2196F3', overnight_rest: '#9C27B0', restart_34h: '#4A148C',
};
const STOP_LABELS: Record<string, string> = {
  start: 'Start', pickup: 'Pickup', dropoff: 'Drop-off', fuel_stop: 'Fuel',
  rest_break: 'Break', overnight_rest: 'Rest (10h)', restart_34h: 'Restart (34h)',
};

interface Props { stops: TripStop[]; }

export default function StopTimeline({ stops }: Props) {
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Stop Timeline</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 1, pb: 1 }}>
        {stops.map((stop, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" display="block" fontWeight={600}>
                    {STOP_LABELS[stop.type] || stop.type}
                  </Typography>
                  <Typography variant="caption" display="block" fontSize="0.65rem">
                    {stop.location.address ? stop.location.address.split(',')[0] : ''}
                  </Typography>
                </Box>
              }
              sx={{ bgcolor: STOP_COLORS[stop.type] || '#999', color: 'white', height: 'auto',
                py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
            />
            {i < stops.length - 1 && <Box sx={{ width: 24, height: 2, bgcolor: 'grey.400', mx: 0.5 }} />}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
