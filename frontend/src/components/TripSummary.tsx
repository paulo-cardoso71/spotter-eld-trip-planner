import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import type { TripPlanResponse } from '../types';

interface Props { data: TripPlanResponse; }

export default function TripSummary({ data }: Props) {
  const cards = [
    { icon: <RouteIcon />, label: 'Total Distance', value: `${data.total_distance_miles.toLocaleString()} mi` },
    { icon: <AccessTimeIcon />, label: 'Total Duration', value: `${data.total_duration_hours.toFixed(1)} hrs` },
    { icon: <PlaceIcon />, label: 'Stops', value: data.number_of_stops.toString() },
    { icon: <DescriptionIcon />, label: 'Log Days', value: data.number_of_log_days.toString() },
    { icon: <LocalGasStationIcon />, label: 'Est. Fuel Cost', value: `$${data.fuel_cost_estimate.toFixed(2)}` },
  ];

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 4, height: 20, bgcolor: '#ff6d00', borderRadius: 1 }} />
        Trip Summary
      </Typography>
      <Grid container spacing={1.5}>
        {cards.map((card) => (
          <Grid item xs={6} key={card.label}>
            <Card sx={{
              textAlign: 'center',
              borderRadius: 2.5,
              border: '1px solid #e8e8e8',
              boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.2s, transform 0.2s',
              '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transform: 'translateY(-1px)' },
            }}>
              <CardContent sx={{ py: 2, px: 1.5, '&:last-child': { pb: 2 } }}>
                <Box sx={{
                  color: 'white', bgcolor: '#ff6d00', borderRadius: '50%',
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 1, '& .MuiSvgIcon-root': { fontSize: 20 },
                }}>
                  {card.icon}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', letterSpacing: '0.3px' }}>
                  {card.label}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a237e' }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
