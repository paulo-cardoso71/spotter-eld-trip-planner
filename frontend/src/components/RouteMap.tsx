import { useMemo, useCallback, useState } from 'react';
import Map, { Source, Layer, Marker, Popup, NavigationControl } from 'react-map-gl';
import { Box, Typography, Chip } from '@mui/material';
import { TripStop } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const STOP_COLORS: Record<string, string> = {
  start: '#4CAF50', pickup: '#FF9800', dropoff: '#f44336', fuel_stop: '#FFC107',
  rest_break: '#2196F3', overnight_rest: '#9C27B0', restart_34h: '#4A148C',
};
const STOP_LABELS: Record<string, string> = {
  start: 'Start', pickup: 'Pickup', dropoff: 'Drop-off', fuel_stop: 'Fuel',
  rest_break: 'Break', overnight_rest: 'Rest (10h)', restart_34h: 'Restart (34h)',
};

interface Props {
  geometry: GeoJSON.LineString | null;
  stops: TripStop[];
}

export default function RouteMap({ geometry, stops }: Props) {
  const [selectedStop, setSelectedStop] = useState<TripStop | null>(null);

  const bounds = useMemo(() => {
    if (!geometry || !geometry.coordinates.length) return undefined;
    const coords = geometry.coordinates as [number, number][];
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];
  }, [geometry]);

  const routeGeoJSON = useMemo(() => {
    if (!geometry) return null;
    return { type: 'Feature' as const, properties: {}, geometry };
  }, [geometry]);

  const handleMarkerClick = useCallback((stop: TripStop) => { setSelectedStop(stop); }, []);

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={bounds ? {
        bounds,
        fitBoundsOptions: { padding: 60 },
      } : {
        longitude: -95,
        latitude: 39,
        zoom: 4,
      }}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      <NavigationControl position="top-right" />
      {routeGeoJSON && (
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer id="route-line" type="line" paint={{ 'line-color': '#1a237e', 'line-width': 4, 'line-opacity': 0.8 }} />
        </Source>
      )}
      {stops.map((stop, i) => (
        <Marker key={`${stop.type}-${i}`} longitude={stop.location.lng} latitude={stop.location.lat} anchor="center"
          onClick={(e) => { e.originalEvent.stopPropagation(); handleMarkerClick(stop); }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: STOP_COLORS[stop.type] || '#999',
            border: '3px solid white', boxShadow: 2, cursor: 'pointer' }} />
        </Marker>
      ))}
      {selectedStop && (
        <Popup longitude={selectedStop.location.lng} latitude={selectedStop.location.lat}
          onClose={() => setSelectedStop(null)} closeOnClick={false} anchor="bottom">
          <Box sx={{ p: 0.5, minWidth: 180 }}>
            <Chip label={STOP_LABELS[selectedStop.type] || selectedStop.type} size="small"
              sx={{ bgcolor: STOP_COLORS[selectedStop.type], color: 'white', mb: 0.5 }} />
            <Typography variant="body2" fontWeight={600}>
              {selectedStop.location.address || 'Unknown location'}
            </Typography>
            <Typography variant="caption" display="block">
              Arrive: {new Date(selectedStop.arrival_time).toLocaleString()}
            </Typography>
            {selectedStop.duration_hours > 0 && (
              <Typography variant="caption" display="block">Duration: {selectedStop.duration_hours}h</Typography>
            )}
            {selectedStop.notes && (
              <Typography variant="caption" color="text.secondary" display="block">{selectedStop.notes}</Typography>
            )}
          </Box>
        </Popup>
      )}
    </Map>
  );
}
