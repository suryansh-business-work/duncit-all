import { useEffect, useMemo, useRef } from 'react';
import { logs } from '@duncit/logs';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DuncitButton } from '@duncit/buttons';
import { useGeoLocation } from './useGeoLocation';
import { matchLocation, matchZone, type MatchableLocation } from './gps-match';

interface GpsLocationPickerProps {
  locations: MatchableLocation[];
  activeLocationIds?: string[];
  onAutoSelect: (locationId: string, zoneName: string) => void;
  /** Commit + close the dialog (redirect to Home) when the match has live pods. */
  onAutoApply?: (locationId: string, zoneName: string) => void;
}

export default function GpsLocationPicker({
  locations,
  activeLocationIds = [],
  onAutoSelect,
  onAutoApply,
}: Readonly<GpsLocationPickerProps>) {
  const { busy, error, geocoded, request, reset } = useGeoLocation();
  const appliedRef = useRef<string | null>(null);

  const matchedLocation = geocoded ? matchLocation(locations, geocoded) : null;
  const activeSet = useMemo(() => new Set(activeLocationIds), [activeLocationIds]);
  const matchedHasPods = !!matchedLocation && activeSet.has(matchedLocation.id);

  useEffect(() => {
    if (!geocoded || !matchedLocation) return;
    const key = `${matchedLocation.id}|${geocoded.pincode}`;
    if (appliedRef.current === key) return;
    appliedRef.current = key;
    const zone = matchZone(matchedLocation, geocoded.pincode);
    if (matchedHasPods && onAutoApply) onAutoApply(matchedLocation.id, zone);
    else onAutoSelect(matchedLocation.id, zone);
  }, [geocoded, matchedLocation, matchedHasPods, onAutoApply, onAutoSelect]);

  return (
    <Box>
      {/* A tonal green pill: an action, but not the sheet's primary one. */}
      <DuncitButton
        fullWidth
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <MyLocationIcon />}
        onClick={() => {
          reset();
          request().catch((error: unknown) =>
            logs.mWeb.error('GpsLocationPicker', 'request', { error, msg: 'geolocation request failed' }),
          );
        }}
        disabled={busy}
        sx={{
          minHeight: 48,
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 600,
          color: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18) },
          '&.Mui-disabled': { color: 'primary.main', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12) },
        }}
      >
        {busy ? 'Locating…' : 'Use my location'}
      </DuncitButton>
      {geocoded?.city && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mt: 0.5
          }}>
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
          Duncit isn&apos;t in <strong>{geocoded.city || 'your area'}</strong> yet. Pick a city below.
        </Alert>
      )}
      {geocoded && matchedLocation && !matchedHasPods && (
        <Alert severity="info" sx={{ mt: 1 }}>
          No live pods in <strong>{matchedLocation.location_name}</strong> right now. Pick a city below.
        </Alert>
      )}
      {geocoded && matchedLocation && matchedHasPods && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Selected <strong>{matchedLocation.location_name}</strong> based on your location.
        </Alert>
      )}
    </Box>
  );
}
