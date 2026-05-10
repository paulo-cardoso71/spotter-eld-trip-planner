import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import { TripPlanResponse } from '../types';

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
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>Trip Summary</Typography>
      <Grid container spacing={1}>
        {cards.map((card) => (
          <Grid item xs={6} key={card.label}>
            <Card variant="outlined" sx={{ textAlign: 'center', py: 1 }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ color: 'secondary.main', mb: 0.5 }}>{card.icon}</Box>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                <Typography variant="body1" fontWeight={700}>{card.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
