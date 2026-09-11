import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** The account address Google just authenticated — named so the user knows
   * exactly which Duncit account they are granting access to. */
  email: string;
  busy: boolean;
  error: string | null;
  onAllow: () => void;
  onDeny: () => void;
}

/**
 * The consent step for granting Google sign-in to an email/password account.
 *
 * Reached when loginWithGoogle answers EMAIL_LOGIN_REQUIRED. The server has
 * already verified the Google token and matched its verified address to this
 * account, so nothing here proves identity — it collects INTENT. Denying leaves
 * the account exactly as it was and returns to the login form with a warning.
 *
 * Not dismissible by backdrop or Esc: a silent close would look like the grant
 * succeeded. Both outcomes go through an explicit button. Native twin.
 */
export default function GoogleLinkConsentDialog({
  open,
  email,
  busy,
  error,
  onAllow,
  onDeny,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      // Consent is an explicit choice: Escape must not stand in for "deny".
      onClose={(_e, reason) => {
        if (reason !== 'escapeKeyDown') onDeny();
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontSize: 17, fontWeight: 600 }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <LinkRoundedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
          <span>{t('mweb.login.linkConsentTitle')}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t('mweb.login.linkConsentBody', { vars: { email } })}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.login.linkConsentDetail')}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <DuncitButton
          variant="outlined"
          color="inherit"
          onClick={onDeny}
          disabled={busy}
          sx={{ flex: 1 }}
        >
          {t('mweb.login.linkConsentDeny')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={onAllow} disabled={busy} sx={{ flex: 1.4 }}>
          {t('mweb.login.linkConsentAllow')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
