import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
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
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { PUBLIC_CLIENT_CONFIG } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The message to send — a line of text and the map link under it. */
  onSend: (text: string) => void;
}

/** A Google Maps search URL, which opens in any browser and every phone. */
const searchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/**
 * The preview, from the Maps EMBED API.
 *
 * An iframe rather than the Maps JS API: no script for the page to load, no
 * library on seventeen portal bundles, and the embed takes a plain search
 * string — so "the Blue Tokai on Church Street" resolves without a geocoding
 * round trip of our own.
 */
const embedUrl = (key: string, query: string) =>
  `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`;

/**
 * Share a place — look at it first, then send it.
 *
 * The message itself is still a LINK, deliberately: the recipient opens it in
 * their own Maps, already signed in, with their own directions and history. The
 * map in this dialog is for the SENDER, answering the question that used to be
 * unanswerable before pressing send — is this the right Church Street.
 */
export default function LocationDialog({ open, onClose, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  /** What the map is showing — set by Search, not by every keystroke. */
  const [shown, setShown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const { data } = useQuery<{ publicClientConfig: { google_maps_api_key: string } }>(
    PUBLIC_CLIENT_CONFIG,
    { skip: !open, fetchPolicy: 'cache-first' }
  );
  const mapsKey = data?.publicClientConfig?.google_maps_api_key ?? '';

  // A new dialog starts blank rather than on the last place somebody sent.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setShown('');
      setError(null);
    }
  }, [open]);

  const preview = () => {
    const term = query.trim();
    if (!term) return;
    setError(null);
    setShown(term);
  };

  const useHere = () => {
    setError(null);
    setLocating(true);
    globalThis.navigator.geolocation?.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const point = `${latitude},${longitude}`;
        setQuery(point);
        setShown(point);
        setLocating(false);
      },
      (err) => {
        setError(err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  // The only caller is the Send button below, already disabled while `shown`
  // is empty — nothing else invokes this, so there is no "empty" case to guard.
  const send = () => {
    onSend(`📍 ${shown}\n${searchUrl(shown)}`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('shell.chat.location.label')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              label={t('shell.chat.location.label')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && preview()}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }
              }}
            />
            <DuncitButton onClick={preview} disabled={!query.trim()}>
              {t('shell.chat.location.search')}
            </DuncitButton>
          </Stack>

          <DuncitButton
            size="small"
            startIcon={<MyLocationIcon />}
            onClick={useHere}
            disabled={locating}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t(locating ? 'shell.chat.location.searching' : 'shell.chat.location.useMyLocation')}
          </DuncitButton>

          <LocationPreview mapsKey={mapsKey} shown={shown} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.chat.location.cancel')}</DuncitButton>
        <DuncitButton variant="contained" onClick={send} disabled={!shown}>
          {t('shell.chat.location.send')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

/**
 * The map, or an honest reason there isn't one.
 *
 * A missing Maps key is a Tech-portal configuration state, not a reason to
 * refuse to share a place — the link works either way, so the preview says
 * what is missing and sending stays available.
 */
function LocationPreview({ mapsKey, shown }: Readonly<{ mapsKey: string; shown: string }>) {
  const { t } = useTranslation();

  if (!shown) {
    return (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('shell.chat.location.pickOne')}
      </Typography>
    );
  }

  if (!mapsKey) {
    return <Alert severity="info">{t('shell.chat.location.noKey')}</Alert>;
  }

  return (
    <Box
      component="iframe"
      title={t('shell.chat.location.preview', { vars: { name: shown } })}
      src={embedUrl(mapsKey, shown)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      sx={{ width: '100%', height: 260, border: 0, borderRadius: 1 }}
    />
  );
}
