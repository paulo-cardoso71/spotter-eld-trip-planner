import { Box, Card, CardContent, Typography } from '@mui/material';
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
    <Box sx={{ py: 3 }}>
      <Typography variant="h6" gutterBottom sx={{
        fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 2.5,
      }}>
        <Box sx={{ width: 4, height: 24, bgcolor: '#ff6d00', borderRadius: 1 }} />
        Trip Summary
      </Typography>
      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2.5,
      }}>
        {cards.map((card) => (
          <Card key={card.label} sx={{
            flex: '1 1 180px',
            minWidth: 160,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #e8e8e8',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.12)', transform: 'translateY(-3px)' },
          }}>
            <CardContent sx={{ py: 3, px: 2.5, '&:last-child': { pb: 3 } }}>
              <Box sx={{
                color: 'white', bgcolor: '#ff6d00', borderRadius: '50%',
                width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 1.5, '& .MuiSvgIcon-root': { fontSize: 26 },
              }}>
                {card.icon}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{
                fontSize: '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 500,
              }}>
                {card.label}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.4rem', color: '#1a237e', mt: 0.5 }}>
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
