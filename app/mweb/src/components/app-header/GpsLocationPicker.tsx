import { useEffect, useMemo, useRef } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
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
    <Box sx={{ mb: 1.5 }}>
      <Button
        fullWidth
        size="small"
        variant="outlined"
        startIcon={busy ? <CircularProgress size={14} /> : <GpsFixedIcon fontSize="small" />}
        onClick={() => {
          reset();
          request().catch(console.error);
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
