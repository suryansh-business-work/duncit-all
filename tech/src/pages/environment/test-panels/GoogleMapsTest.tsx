import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';

/** Maps tab: typing a key renders a live Google map client-side. */
export default function GoogleMapsTest() {
  const [mapsKey, setMapsKey] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadedKey || !mapRef.current) return;
    setMapError(null);
    const id = 'gmaps-test-script';
    (window as any).__duncitMapInit = () => {
      const g = (window as any).google;
      if (!g?.maps) {
        setMapError('Maps failed to load — check the key.');
        return;
      }
      new g.maps.Map(mapRef.current, { center: { lat: 20.5937, lng: 78.9629 }, zoom: 4 });
    };
    document.getElementById(id)?.remove();
    delete (window as any).google;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(loadedKey)}&callback=__duncitMapInit`;
    script.onerror = () => setMapError('Maps script failed to load.');
    document.body.appendChild(script);
  }, [loadedKey]);

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Enter a Maps API key — the map below renders the moment you load it.
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Maps API key"
          value={mapsKey}
          onChange={(e) => setMapsKey(e.target.value)}
          fullWidth
          type="password"
          autoComplete="off"
          inputProps={{ autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }}
        />
        <Button startIcon={<MapIcon />} variant="contained" onClick={() => setLoadedKey(mapsKey.trim())} disabled={!mapsKey.trim()}>
          Load
        </Button>
      </Stack>
      {mapError && <Alert severity="error">{mapError}</Alert>}
      <Box ref={mapRef} sx={{ height: 280, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }} />
    </Stack>
  );
}
