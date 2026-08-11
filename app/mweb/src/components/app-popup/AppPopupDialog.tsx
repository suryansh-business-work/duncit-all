import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../../i18n/useTranslation';
import { ACTIVE_APP_POPUP, DISMISS_APP_POPUP, type ActiveAppPopup } from './queries';
import { detectClientPlatform } from './platform';

/**
 * The marketing image shown over the app when it opens — the twin of the
 * native app's overlay (rule 27): same query, same once-per-person rule, same
 * chrome, in MUI instead of Tamagui.
 *
 * The server hands back at most one popup and only for somebody who has not
 * closed it, so there is no eligibility logic here. Closing tells the server,
 * which is what stops it coming back on the next visit and on the user's phone.
 *
 * Dismissible by design: the ✕ can be turned off per campaign, but clicking
 * the backdrop always closes it, so nobody is trapped behind an ad.
 */
export default function AppPopupDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [closed, setClosed] = useState(false);
  const platform = useMemo(() => detectClientPlatform(globalThis.navigator?.userAgent ?? ''), []);

  const { data } = useQuery<{ activeAppPopup: ActiveAppPopup | null }>(ACTIVE_APP_POPUP, {
    variables: { platform },
    fetchPolicy: 'cache-and-network',
  });
  const [dismiss] = useMutation(DISMISS_APP_POPUP);

  const popup = data?.activeAppPopup ?? null;
  if (!popup || closed) return null;

  const close = () => {
    setClosed(true);
    // A failed write only costs the popup showing once more — never worth an
    // error toast over a marketing image the user has already dismissed.
    dismiss({ variables: { id: popup.id } }).catch(() => undefined);
  };

  const onCta = () => {
    close();
    if (popup.cta_url.startsWith('http')) {
      globalThis.open(popup.cta_url, '_blank', 'noopener');
      return;
    }
    navigate(popup.cta_url);
  };

  return (
    <Dialog open onClose={close} fullWidth maxWidth="xs" aria-label="App popup">
      <Box sx={{ position: 'relative' }}>
        <Box
          component="img"
          src={popup.image_url}
          alt=""
          sx={{ display: 'block', width: '100%', height: 'auto', maxHeight: '70dvh', objectFit: 'contain' }}
        />
        {popup.close_button_enabled && (
          <IconButton
            aria-label={t('mweb.appPopup.close')}
            onClick={close}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.55)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Stack spacing={1} sx={{ p: 2 }}>
        {popup.cta_url && (
          <Button variant="contained" fullWidth onClick={onCta}>
            {popup.cta_label}
          </Button>
        )}
        {!popup.close_button_enabled && (
          <Typography variant="caption" color="text.secondary" textAlign="center">
            {t('mweb.appPopup.tapToClose')}
          </Typography>
        )}
      </Stack>
    </Dialog>
  );
}
