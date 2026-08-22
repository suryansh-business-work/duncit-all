import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import { sessionT, type SessionTranslate } from './i18n';

export interface UserDataNotLoadedDialogProps {
  open: boolean;
  errorMessage?: string | null;
  onReload: () => void;
  onLogout: () => void;
  /**
   * A translator. `UserProvider` renders this dialog as a sibling of the locale
   * provider (which reads the signed-in user's language from this very
   * context), so there is no live one in scope there and the shipped English
   * stands in — see `sessionT`.
   */
  t?: SessionTranslate;
}

// Surfaced when the user appears to be authenticated (token present) but the
// server-side `me` payload failed to load — usually a session that has
// silently expired, a stale cache, or a flaky network. We deliberately offer
// two recoveries: a soft retry (reload) and a hard reset (logout + redirect).
export default function UserDataNotLoadedDialog({
  open,
  errorMessage,
  onReload,
  onLogout,
  t = sessionT,
}: Readonly<UserDataNotLoadedDialogProps>) {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      // No outside-click dismissal: the app is unusable without user data, so
      // we don't let the user accidentally dismiss the recovery prompt.
      onClose={(_e, reason) => {
        if (reason === 'backdropClick') return;
      }}
      PaperProps={{ sx: { borderRadius: 2.5, maxWidth: 420 } }}
    >
      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>{t('session.notLoaded.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {t('session.notLoaded.body')}
          </Typography>
          {errorMessage && (
            <Alert severity="warning" sx={{ fontSize: 13 }}>
              {errorMessage}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            {t('session.notLoaded.signOutHint')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onLogout} startIcon={<LogoutIcon />} color="inherit">
          {t('session.notLoaded.logout')}
        </Button>
        <Button onClick={onReload} startIcon={<RefreshIcon />} variant="contained">
          {t('session.notLoaded.reload')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
