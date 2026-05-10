import { Box, Typography, AppBar, Toolbar, Chip } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1a237e 100%)',
          borderBottom: '3px solid #ff6d00',
        }}
      >
        <Toolbar sx={{ py: 0.5 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, p: 0.8, mr: 1.5,
          }}>
            <LocalShippingIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1.2 }}>
              ELD Trip Planner
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.65rem' }}>
              Hours of Service Route Planning
            </Typography>
          </Box>
          <Chip
            label="HOS Compliant"
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)', color: 'white',
              fontWeight: 600, fontSize: '0.7rem', display: { xs: 'none', sm: 'flex' },
            }}
          />
        </Toolbar>
      </AppBar>
      <Box sx={{
        display: 'flex', flexGrow: 1,
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: { md: 'calc(100vh - 68px)' },
      }}>
        {/* Sidebar */}
        <Box sx={{
          width: { xs: '100%', md: 400 }, flexShrink: 0,
          p: 2.5, overflowY: 'auto',
          bgcolor: '#fafafa',
          borderRight: { md: '1px solid #e0e0e0' },
        }}>
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
        {/* Map area */}
        <Box sx={{ flexGrow: 1, minHeight: { xs: 400, md: '100%' }, position: 'relative' }}>
          {!result && (
            <Box sx={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, pointerEvents: 'none',
              background: 'linear-gradient(180deg, rgba(26,35,126,0.06) 0%, rgba(26,35,126,0.02) 100%)',
            }}>
              <Box sx={{
                bgcolor: 'white', borderRadius: 4, p: 4, textAlign: 'center',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                maxWidth: 360,
              }}>
                <Box sx={{
                  bgcolor: '#f5f5f5', borderRadius: '50%', width: 72, height: 72,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 2,
                }}>
                  <MapIcon sx={{ fontSize: 36, color: '#1a237e', opacity: 0.6 }} />
                </Box>
                <Typography variant="h6" sx={{ color: '#1a237e', mb: 0.5 }}>
                  Plan Your Route
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter your current location, pickup, and dropoff to see the optimized HOS-compliant route displayed here.
                </Typography>
              </Box>
            </Box>
          )}
          <RouteMap geometry={result?.route?.geometry || null} stops={result?.stops || []} />
        </Box>
      </Box>
      {result && (
        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto', width: '100%' }}>
          <StopTimeline stops={result.stops} />
        </Box>
      )}
      {result && (
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 6, maxWidth: 1400, mx: 'auto', width: '100%' }}>
          <LogSheetList logs={result.daily_logs} />
        </Box>
      )}
    </Box>
  );
}

export default App;
