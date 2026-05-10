import { useState, useEffect, useRef } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import type { LocationInput } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface Props {
  label: string;
  value: LocationInput | null;
  onChange: (location: LocationInput | null) => void;
}

interface MapboxFeature {
  place_name: string;
  center: [number, number];
}

export default function LocationAutocomplete({ label, value, onChange }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<LocationInput[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputValue || inputValue.length < 3) { setOptions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          inputValue
        )}.json?access_token=${MAPBOX_TOKEN}&types=place,address&limit=5&country=US,CA,MX`;
        const resp = await fetch(url);
        const data = await resp.json();
        const results: LocationInput[] = (data.features || []).map(
          (f: MapboxFeature) => ({ address: f.place_name, lat: f.center[1], lng: f.center[0] })
        );
        setOptions(results);
      } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputValue]);

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_, newInput) => setInputValue(newInput)}
      options={options}
      getOptionLabel={(opt) => opt.address}
      isOptionEqualToValue={(opt, val) => opt.lat === val.lat && opt.lng === val.lng}
      loading={loading}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required
          size="small"
        />
      )}
      fullWidth
      sx={{ mb: 2 }}
    />
  );
}
