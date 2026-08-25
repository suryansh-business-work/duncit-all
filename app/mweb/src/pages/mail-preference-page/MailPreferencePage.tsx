import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import ConfirmDialog from '../../components/ConfirmDialog';
import { AuthMessagesCard } from '../account-page/comm-preference';
import MailPreferenceSection from './MailPreferenceSection';
import { useMailPreferences, type MailPreferenceToken } from './useMailPreferences';

interface Props {
  /**
   * True for `/unsubscribe`, the page an email link opens. It reads the
   * signature out of the query string instead of the session — nobody clicking
   * "unsubscribe" in their inbox is signed in, and asking them to be is how an
   * opt-out turns into a complaint.
   */
  fromLink?: boolean;
}

/** The signature in the URL, or null when there isn't a usable one. */
function tokenFrom(params: URLSearchParams): MailPreferenceToken | null {
  const e = params.get('e');
  const t = params.get('t');
  return e && t ? { e, t } : null;
}

/**
 * Mail Preference — every kind of email Duncit sends, and which ones this
 * person still wants. Reached from Profile when signed in, and straight from
 * the footer of any opt-out-able email when not.
 */
export default function MailPreferencePage({ fromLink = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = fromLink ? tokenFrom(params) : null;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const state = useMailPreferences(token);

  // A link with no signature at all, or one the server would not accept.
  if (fromLink && (token === null || state.linkInvalid)) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', p: 2 }}>
        <Alert severity="warning">{t('mailPreference.linkInvalid')}</Alert>
        <Button component={RouterLink} to="/account/mail-preference" variant="contained">
          {t('mailPreference.signIn')}
        </Button>
      </Stack>
    );
  }

  if (state.loading) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!state.preference) {
    return <Alert severity="error">{t('mailPreference.loadFailed')}</Alert>;
  }

  const optional = state.preference.categories.filter((item) => !item.required);
  const required = state.preference.categories.filter((item) => item.required);
  const allOff = optional.every((item) => !item.enabled);
  // Computed here rather than inline in the prop so the branch sits at nesting
  // zero and the JSX below stays a layout (S3776).
  const bulkLabel = allOff
    ? t('mailPreference.resubscribeAll')
    : t('mailPreference.unsubscribeAll');
  const bulkAction = () => {
    if (allOff) {
      state.setAll(true);
      return;
    }
    setConfirmOpen(true);
  };

  // An opt-out is confirmed by email, so the snackbar says so. Hoisted out of
  // the JSX to keep the branch at nesting zero (S3776).
  const savedMessage = state.confirmationSent
    ? `${t('mailPreference.saved')} ${t('mailPreference.confirmationSent')}`
    : t('mailPreference.saved');

  const bulkButton =
    allOff && !state.canResubscribeAll ? null : (
      <Box sx={{ pt: 1.5 }}>
        <Button
          fullWidth
          variant="outlined"
          color={allOff ? 'primary' : 'error'}
          onClick={bulkAction}
          disabled={state.busyCategory !== null}
        >
          {bulkLabel}
        </Button>
      </Box>
    );

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', pb: 4 }}>
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{
          fontWeight: 800
        }}>
          {fromLink ? t('mailPreference.linkTitle') : t('mailPreference.title')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('mailPreference.subtitle', { vars: { email: state.preference.email } })}
        </Typography>
      </Stack>

      {state.saveFailed && <Alert severity="error">{t('mailPreference.saveFailed')}</Alert>}

      {/* Signed-in only: `/unsubscribe` is read by somebody in their inbox
          who has no session, and the sheet this card writes needs one. */}
      {!fromLink && <AuthMessagesCard channel="EMAIL" />}

      <MailPreferenceSection
        heading={t('mailPreference.optionalHeading')}
        items={optional}
        busyCategory={state.busyCategory}
        onChange={state.setCategory}
        footer={bulkButton}
      />

      <MailPreferenceSection
        heading={t('mailPreference.requiredHeading')}
        hint={t('mailPreference.requiredHint')}
        items={required}
        busyCategory={state.busyCategory}
        onChange={state.setCategory}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t('mailPreference.unsubscribeAllTitle')}
        message={t('mailPreference.unsubscribeAllMessage')}
        confirmLabel={t('mailPreference.unsubscribeAll')}
        destructive
        busy={state.busyCategory !== null}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          state.setAll(false);
        }}
      />

      <Snackbar
        open={state.saved}
        autoHideDuration={2500}
        onClose={state.dismissSaved}
        message={savedMessage}
      />
    </Stack>
  );
}
