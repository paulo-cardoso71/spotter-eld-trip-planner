import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useTripPlanner } from './hooks/useTripPlanner';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import TripSummary from './components/TripSummary';
import StopTimeline from './components/StopTimeline';
import LogSheetList from './components/LogSheetList';

function App() {
  const {
    form, result, loading, error,
    setCurrentLocation, setPickupLocation, setDropoffLocation, setCycleUsed,
    submitTrip, setError,
  } = useTripPlanner();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>ELD Trip Planner</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: { xs: 'column', md: 'row' }, minHeight: { md: 'calc(100vh - 64px)' } }}>
        <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, p: 2, overflowY: 'auto' }}>
          <TripForm
            currentLocation={form.currentLocation} pickupLocation={form.pickupLocation}
            dropoffLocation={form.dropoffLocation} cycleUsed={form.cycleUsed}
            loading={loading} error={error}
            onCurrentLocationChange={setCurrentLocation} onPickupLocationChange={setPickupLocation}
            onDropoffLocationChange={setDropoffLocation} onCycleUsedChange={setCycleUsed}
            onSubmit={submitTrip} onDismissError={() => setError(null)}
          />
          {result && <TripSummary data={result} />}
        </Box>
        <Box sx={{ flexGrow: 1, minHeight: { xs: 400, md: '100%' }, position: 'relative' }}>
          <RouteMap geometry={result?.route?.geometry || null} stops={result?.stops || []} />
        </Box>
      </Box>
      {result && (
        <Box sx={{ px: 2 }}>
          <StopTimeline stops={result.stops} />
        </Box>
      )}
      {result && (
        <Box sx={{ px: 2, pb: 4 }}>
          <LogSheetList logs={result.daily_logs} />
        </Box>
      )}
    </Box>
  );
}

export default App;
