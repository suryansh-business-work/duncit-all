import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import ConfirmDialog from '../../components/ConfirmDialog';
import { AuthMessagesCard } from '../account-page/comm-preference';
import NoWhatsAppNumberCard from './NoWhatsAppNumberCard';
import WhatsAppPreferenceSection from './WhatsAppPreferenceSection';
import { useWhatsAppPreferences } from './useWhatsAppPreferences';

/**
 * WhatsApp Preference — every kind of WhatsApp message Duncit sends, and which
 * ones this person still wants. Reached from Profile.
 *
 * Mail Preference's twin, because they answer the same question about a
 * different channel, and the native screen is in turn this one's twin
 * (rule 27). The one state mail cannot be in: there may be no number to message
 * at all, which the server answers as `reachable` and this screen only renders.
 */
export default function WhatsAppPreferencePage() {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const state = useWhatsAppPreferences();

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
    return <Alert severity="error">{t('whatsappPreference.loadFailed')}</Alert>;
  }

  const { categories, destination, reachable } = state.preference;
  const optional = categories.filter((item) => !item.required);
  const required = categories.filter((item) => item.required);
  const allOff = optional.every((item) => !item.enabled);
  // Computed here rather than inline in the prop so the branch sits at nesting
  // zero and the JSX below stays a layout (S3776).
  const bulkLabel = allOff
    ? t('whatsappPreference.turnAllOn')
    : t('whatsappPreference.turnAllOff');
  const bulkAction = () => {
    if (allOff) {
      state.setAll(true);
      return;
    }
    setConfirmOpen(true);
  };

  const bulkButton = (
    <Box sx={{ pt: 1.5 }}>
      <Button
        fullWidth
        variant="outlined"
        color={allOff ? 'primary' : 'error'}
        onClick={bulkAction}
        disabled={state.busyCategory !== null || !reachable}
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
          {t('whatsappPreference.title')}
        </Typography>
        {/* Only worth saying when there is a number to name — with none, the
            card below explains the state instead of a sentence about nobody. */}
        {reachable && (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('whatsappPreference.subtitle', { vars: { destination } })}
          </Typography>
        )}
      </Stack>

      {!reachable && <NoWhatsAppNumberCard />}

      {state.saveFailed && <Alert severity="error">{t('whatsappPreference.saveFailed')}</Alert>}

      <AuthMessagesCard channel="WHATSAPP" />

      <WhatsAppPreferenceSection
        heading={t('whatsappPreference.optionalHeading')}
        items={optional}
        busyCategory={state.busyCategory}
        unreachable={!reachable}
        onChange={state.setCategory}
        footer={bulkButton}
      />

      <WhatsAppPreferenceSection
        heading={t('whatsappPreference.requiredHeading')}
        hint={t('whatsappPreference.requiredHint')}
        items={required}
        busyCategory={state.busyCategory}
        unreachable={!reachable}
        onChange={state.setCategory}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t('whatsappPreference.turnAllOffTitle')}
        message={t('whatsappPreference.turnAllOffMessage')}
        confirmLabel={t('whatsappPreference.turnAllOff')}
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
        message={t('whatsappPreference.saved')}
      />
    </Stack>
  );
}
