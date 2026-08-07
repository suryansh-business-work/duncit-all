import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The message to send — a line of text and the map link under it. */
  onSend: (text: string) => void;
}

/** A Google Maps search URL, which opens in any browser and every phone. */
const searchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** A pin at exact coordinates. */
const pinUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/**
 * Share a place.
 *
 * A LINK rather than an embedded map, deliberately: an embed needs a Maps API
 * key on every portal, a script the CSP has to allow, and a per-load billing
 * event — to show a picture of somewhere the recipient is going to open in
 * Maps anyway. The link opens in their own Maps, already signed in, with their
 * own directions and history.
 *
 * The chat renders it as a link card like any other, so it still reads as a
 * place and not as a wall of URL.
 */
export default function LocationDialog({ open, onClose, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const sendSearch = () => {
    const term = query.trim();
    if (!term) return;
    onSend(`📍 ${term}\n${searchUrl(term)}`);
    setQuery('');
    onClose();
  };

  const sendHere = () => {
    setError(null);
    if (!globalThis.navigator.geolocation) {
      setError('This browser cannot share a location.');
      return;
    }
    setLocating(true);
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onSend(`📍 My location\n${pinUrl(latitude, longitude)}`);
        setLocating(false);
        onClose();
      },
      (positionError) => {
        setLocating(false);
        // A refused permission is a choice, not a fault — say what happened.
        setError(
          positionError.code === positionError.PERMISSION_DENIED
            ? 'Location permission was declined.'
            : 'Could not work out where this device is.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Share a place</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {error && <Alert severity="warning">{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={t('shell.chat.location.label')}
            placeholder="e.g. Cubbon Park, Bengaluru"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                sendSearch();
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
          <Box>
            <Button
              size="small"
              startIcon={<MyLocationIcon />}
              onClick={sendHere}
              disabled={locating}
            >
              {locating ? 'Finding you…' : 'Send where I am'}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Sent as a Google Maps link, so it opens in their own Maps with their
            directions and history.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={sendSearch} disabled={!query.trim()}>
          Send place
        </Button>
      </DialogActions>
    </Dialog>
  );
}
