import { useEffect, useRef } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { useGeoLocation, type GeocodedAddress } from './useGeoLocation';

interface GpsLocationPickerProps {
  locations: any[];
  onAutoSelect: (locationId: string, zoneName: string) => void;
}

function matchLocation(locations: any[], addr: GeocodedAddress) {
  const city = addr.city.trim().toLowerCase();
  if (!city) return null;
  return (
    locations.find(
      (l: any) =>
        (l.city ?? '').toLowerCase() === city ||
        (l.location_name ?? '').toLowerCase() === city
    ) ?? null
  );
}

function matchZone(location: any, pincode: string) {
  if (!pincode) return '';
  const zones = (location?.location_zones ?? []) as any[];
  const hit = zones.find((z) => (z.pincode ?? '').trim() === pincode.trim());
  return hit?.zone_name ?? '';
}

export default function GpsLocationPicker({
  locations,
  onAutoSelect,
}: GpsLocationPickerProps) {
  const { busy, error, geocoded, request, reset } = useGeoLocation();
  const appliedRef = useRef<string | null>(null);

  const matchedLocation = geocoded ? matchLocation(locations, geocoded) : null;

  useEffect(() => {
    if (!geocoded || !matchedLocation) return;
    const key = `${matchedLocation.id}|${geocoded.pincode}`;
    if (appliedRef.current === key) return;
    appliedRef.current = key;
    onAutoSelect(matchedLocation.id, matchZone(matchedLocation, geocoded.pincode));
  }, [geocoded, matchedLocation, onAutoSelect]);

  return (
    <Box sx={{ mb: 1.5 }}>
      <Button
        fullWidth
        size="small"
        variant="outlined"
        startIcon={busy ? <CircularProgress size={14} /> : <GpsFixedIcon fontSize="small" />}
        onClick={() => {
          reset();
          void request();
        }}
        disabled={busy}
        sx={{
          minHeight: 42,
          borderRadius: 2.25,
          border: '1px solid transparent',
          color: 'primary.main',
          fontWeight: 900,
          background: (theme) => {
            const fill = alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.9);
            return `linear-gradient(${fill}, ${fill}) padding-box, linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}) border-box`;
          },
          '&:hover': {
            border: '1px solid transparent',
            bgcolor: 'transparent',
          },
        }}
      >
        {busy ? 'Locating…' : 'Use my location'}
      </Button>
      {geocoded?.city && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Detected: {geocoded.city}
          {geocoded.pincode ? ` · ${geocoded.pincode}` : ''}
        </Typography>
      )}
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {geocoded && !matchedLocation && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Duncit is not available in <strong>{geocoded.city || 'your area'}</strong> yet.
          Pick another city below to explore nearby pods.
        </Alert>
      )}
      {geocoded && matchedLocation && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Selected <strong>{matchedLocation.location_name}</strong> based on your location.
        </Alert>
      )}
    </Box>
  );
}
