import { Box, Typography, Paper } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
    <Paper sx={{
      p: 3, mt: 3, borderRadius: 3,
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <Box sx={{ width: 4, height: 20, bgcolor: '#ff6d00', borderRadius: 1 }} />
        Stop Timeline
      </Typography>
      <Box sx={{
        display: 'flex', alignItems: 'stretch', overflowX: 'auto', gap: 0, pb: 1,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#ccc', borderRadius: 3 },
      }}>
        {stops.map((stop, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{
              textAlign: 'center', minWidth: 120, px: 1.5, py: 1.5,
              bgcolor: 'white', borderRadius: 2.5,
              border: '2px solid',
              borderColor: STOP_COLORS[stop.type] || '#999',
              transition: 'transform 0.15s, box-shadow 0.15s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%',
                bgcolor: STOP_COLORS[stop.type] || '#999',
                mx: 'auto', mb: 0.8,
              }} />
              <Typography variant="caption" display="block" sx={{
                fontWeight: 700, fontSize: '0.75rem',
                color: STOP_COLORS[stop.type] || '#999',
                textTransform: 'uppercase', letterSpacing: '0.3px',
              }}>
                {STOP_LABELS[stop.type] || stop.type}
              </Typography>
              <Typography variant="caption" display="block" sx={{
                fontSize: '0.7rem', color: 'text.secondary', mt: 0.3,
                maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {stop.location.address ? stop.location.address.split(',')[0] : ''}
              </Typography>
            </Box>
            {i < stops.length - 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mx: 0.5 }}>
                <Box sx={{ width: 20, height: 2, bgcolor: '#bdbdbd' }} />
                <ArrowForwardIcon sx={{ fontSize: 14, color: '#bdbdbd' }} />
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
