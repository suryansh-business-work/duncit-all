import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { EnvEntry } from '../queries';
import GoogleOAuthTest from './GoogleOAuthTest';

/**
 * Google tests are client-side: typing a Maps API key loads a live map via the
 * Maps JS API, and the OAuth section runs a real sign-in using the entry's
 * client_id, then shows the decoded user profile.
 */
export default function GoogleTestPanel({ entry }: { entry: EnvEntry }) {
  const [mapsKey, setMapsKey] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const clientId = entry.config.find((p) => p.key === 'client_id')?.value ?? '';

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
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700}>Maps</Typography>
        <Typography variant="body2" color="text.secondary">Enter a Maps API key to render a live map.</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField size="small" label="Maps API key" value={mapsKey} onChange={(e) => setMapsKey(e.target.value)} fullWidth type="password" />
          <Button startIcon={<MapIcon />} variant="contained" onClick={() => setLoadedKey(mapsKey.trim())} disabled={!mapsKey.trim()}>
            Load
          </Button>
        </Stack>
        {mapError && <Alert severity="error" sx={{ mt: 1 }}>{mapError}</Alert>}
        <Box ref={mapRef} sx={{ mt: 1, height: 240, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }} />
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" fontWeight={700}>OAuth</Typography>
        {clientId ? (
          <GoogleOAuthProvider clientId={clientId}>
            <GoogleOAuthTest />
          </GoogleOAuthProvider>
        ) : (
          <Alert severity="info" sx={{ mt: 1 }}>Set an OAuth Client ID on this entry to test sign-in.</Alert>
        )}
      </Box>
    </Stack>
  );
}
