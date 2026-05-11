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
      p: { xs: 2.5, md: 3.5 }, mt: 3, borderRadius: 3,
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    }}>
      <Typography variant="h6" gutterBottom sx={{
        display: 'flex', alignItems: 'center', gap: 1, mb: 2.5,
        fontSize: '1.2rem', fontWeight: 700,
      }}>
        <Box sx={{ width: 4, height: 24, bgcolor: '#ff6d00', borderRadius: 1 }} />
        Stop Timeline
      </Typography>
      <Box sx={{
        display: 'flex', alignItems: 'stretch', overflowX: 'auto', gap: 0, pb: 1.5, pt: 0.5,
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-track': { bgcolor: '#f0f0f0', borderRadius: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#bdbdbd', borderRadius: 4, '&:hover': { bgcolor: '#999' } },
      }}>
        {stops.map((stop, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{
              textAlign: 'center', minWidth: 150, px: 2, py: 2,
              bgcolor: 'white', borderRadius: 3,
              border: '2px solid',
              borderColor: STOP_COLORS[stop.type] || '#999',
              transition: 'transform 0.15s, box-shadow 0.15s',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' },
            }}>
              <Box sx={{
                width: 12, height: 12, borderRadius: '50%',
                bgcolor: STOP_COLORS[stop.type] || '#999',
                mx: 'auto', mb: 1,
              }} />
              <Typography variant="body2" component="div" sx={{
                fontWeight: 700, fontSize: '0.85rem',
                color: STOP_COLORS[stop.type] || '#999',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                mb: 0.8,
              }}>
                {STOP_LABELS[stop.type] || stop.type}
              </Typography>
              <Typography variant="caption" component="div" sx={{
                fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.4,
                maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                mx: 'auto',
              }}>
                {stop.location.address ? stop.location.address.split(',')[0] : ''}
              </Typography>
            </Box>
            {i < stops.length - 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
                <Box sx={{ width: 24, height: 2, bgcolor: '#bdbdbd' }} />
                <ArrowForwardIcon sx={{ fontSize: 16, color: '#bdbdbd' }} />
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
