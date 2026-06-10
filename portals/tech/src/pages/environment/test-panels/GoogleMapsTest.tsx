import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import type { EnvEntry } from '../queries';

/**
 * Maps test: renders a live Google map using the key SAVED on this entry's
 * config. The key is never re-entered here — it comes from the stored config
 * (Maps API Key), matching how every other category test reads its credentials.
 */
export default function GoogleMapsTest({ entry }: Readonly<{ entry: EnvEntry }>) {
  const savedKey = entry.config.find((p) => p.key === 'maps_api_key')?.value ?? '';
  const [load, setLoad] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!load || !savedKey || !mapRef.current) return;
    setMapError(null);
    const id = 'gmaps-test-script';
    (window as any).__duncitMapInit = () => {
      const g = (window as any).google;
      if (!g?.maps) {
        setMapError('Maps failed to load — check the saved key.');
        return;
      }
      new g.maps.Map(mapRef.current, { center: { lat: 20.5937, lng: 78.9629 }, zoom: 4 });
    };
    document.getElementById(id)?.remove();
    delete (window as any).google;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(savedKey)}&callback=__duncitMapInit`;
    script.onerror = () => setMapError('Maps script failed to load.');
    document.body.appendChild(script);
  }, [load, savedKey]);

  if (!savedKey) {
    return <Alert severity="info">Set a Maps API Key on this entry to run the map test.</Alert>;
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Renders a live Google map using this entry's saved Maps API Key.
      </Typography>
      <Button startIcon={<MapIcon />} variant="contained" onClick={() => setLoad(true)} disabled={load}>
        {load ? 'Loaded' : 'Load map'}
      </Button>
      {mapError && <Alert severity="error">{mapError}</Alert>}
      <Box ref={mapRef} sx={{ height: 280, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }} />
    </Stack>
  );
}
