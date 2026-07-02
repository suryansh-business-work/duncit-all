import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import SearchIcon from '@mui/icons-material/Search';
import { useVenueGeocoder, type VenueGeocodeResult } from './useVenueGeocoder';
import type { VenueLocationValues } from './register-venue/register-venue.types';

interface VenueLocationFinderProps {
  locations: any[];
  value: VenueLocationValues;
  onChange: (next: VenueLocationValues) => void;
}

function applyGeocodeToForm(
  prev: VenueLocationValues,
  result: VenueGeocodeResult,
  locations: any[]
): { next: VenueLocationValues; matchedLocation: any | null } {
  const cityLower = result.city.toLowerCase();
  const matched =
    locations.find(
      (l: any) =>
        (l.city ?? '').toLowerCase() === cityLower ||
        (l.location_name ?? '').toLowerCase() === cityLower
    ) ?? null;

  const zones = matched?.location_zones ?? [];
  const zoneMatch =
    zones.find((z: any) => (z.pincode ?? '').trim() === result.pincode) ?? null;

  return {
    matchedLocation: matched,
    next: {
      ...prev,
      country: matched?.country || result.country || prev.country,
      country_code: matched?.country_code || result.country_code || prev.country_code,
      state: matched?.state || result.state || prev.state,
      state_code: matched?.state_code || result.state_code || prev.state_code,
      city: matched ? matched.city || matched.location_name : result.city,
      location_id: matched?.id ?? '',
      locality: zoneMatch?.zone_name ?? prev.locality,
      postal_code: zoneMatch?.pincode || matched?.location_pincode || result.pincode || prev.postal_code,
    },
  };
}

export default function VenueLocationFinder({
  locations,
  value,
  onChange,
}: Readonly<VenueLocationFinderProps>) {
  const { busy, error, result, fromGps, fromSearch, reset } = useVenueGeocoder();
  const [query, setQuery] = useState('');
  const [matched, setMatched] = useState<any | null>(null);
  const [showUnsupported, setShowUnsupported] = useState(false);

  useEffect(() => {
    if (!result) return;
    const { next, matchedLocation } = applyGeocodeToForm(value, result, locations);
    onChange(next);
    setMatched(matchedLocation);
    setShowUnsupported(!matchedLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="outlined"
          size="small"
          startIcon={busy ? <CircularProgress size={14} /> : <GpsFixedIcon fontSize="small" />}
          onClick={() => {
            reset();
            setMatched(null);
            setShowUnsupported(false);
            void fromGps();
          }}
          disabled={busy}
        >
          {busy ? 'Locating…' : 'Find my location'}
        </Button>
        <TextField
          size="small"
          fullWidth
          placeholder="Search for an address or landmark"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault();
              reset();
              setMatched(null);
              setShowUnsupported(false);
              void fromSearch(query);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {result && matched && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Matched to <strong>{matched.location_name}</strong>. Address fields filled —
          please review.
        </Alert>
      )}
      {result && showUnsupported && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Duncit doesn't operate in <strong>{result.city || 'this area'}</strong> yet.
          We've filled the address based on the geocoder but the city dropdown will not
          match. Pick a supported city below to continue.
        </Alert>
      )}
      {result?.formatted_address && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Detected: {result.formatted_address}
        </Typography>
      )}
    </Box>
  );
}
