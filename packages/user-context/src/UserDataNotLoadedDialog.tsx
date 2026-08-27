import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import { DuncitButton } from '@duncit/buttons';
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
      // Neither outside-click nor Escape dismisses this: the app is unusable
      // without user data, so the recovery prompt cannot be waved away. MUI 9
      // removed disableEscapeKeyDown, so Escape is refused here by reason.
      onClose={(_e, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
      }}
      slotProps={{
        paper: { sx: { borderRadius: 2.5, maxWidth: 420 } }
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>{t('session.notLoaded.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('session.notLoaded.body')}
          </Typography>
          {errorMessage && (
            <Alert severity="warning" sx={{ fontSize: 13 }}>
              {errorMessage}
            </Alert>
          )}
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('session.notLoaded.signOutHint')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <DuncitButton onClick={onLogout} startIcon={<LogoutIcon />} color="inherit">
          {t('session.notLoaded.logout')}
        </DuncitButton>
        <DuncitButton onClick={onReload} startIcon={<RefreshIcon />} variant="contained">
          {t('session.notLoaded.reload')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
