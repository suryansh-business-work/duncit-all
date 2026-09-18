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
import { SOCIAL_AUTH_COPY, type SocialProvider } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** Which door asked — the dialog names it. */
  provider: SocialProvider;
  /** The account address the provider just authenticated — named so the user knows
   * exactly which Duncit account they are granting access to. */
  email: string;
  busy: boolean;
  error: string | null;
  onAllow: () => void;
  onDeny: () => void;
}

/**
 * The consent step for granting Google (or Apple) sign-in to an email/password
 * account.
 *
 * Reached when the provider's login answers EMAIL_LOGIN_REQUIRED. The server has
 * already verified the token and matched its verified address to this
 * account, so nothing here proves identity — it collects INTENT. Denying leaves
 * the account exactly as it was and returns to the login form with a warning.
 *
 * Not dismissible by backdrop or Esc: a silent close would look like the grant
 * succeeded. Both outcomes go through an explicit button. Native twin.
 */
export default function GoogleLinkConsentDialog({
  open,
  provider,
  email,
  busy,
  error,
  onAllow,
  onDeny,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = SOCIAL_AUTH_COPY[provider];

  return (
    <Dialog
      data-testid="google-link-consent"
      open={open}
      // Consent is an explicit choice: Escape must not stand in for "deny".
      onClose={(_e, reason) => {
        if (reason !== 'escapeKeyDown') onDeny();
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle data-testid="google-link-consent-title" sx={{ fontSize: 17, fontWeight: 600 }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <LinkRoundedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
          <span>{t(copy.linkTitle)}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t(copy.linkBody, { vars: { email } })}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t(copy.linkDetail)}
          </Typography>
          {error && <Alert data-testid="google-link-consent-error" severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <DuncitButton
          data-testid="google-link-deny"
          variant="outlined"
          color="inherit"
          onClick={onDeny}
          disabled={busy}
          sx={{ flex: 1 }}
        >
          {t('mweb.login.linkConsentDeny')}
        </DuncitButton>
        <DuncitButton
          data-testid="google-link-allow"
          variant="contained"
          onClick={onAllow}
          disabled={busy}
          sx={{ flex: 1.4 }}
        >
          {t('mweb.login.linkConsentAllow')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
