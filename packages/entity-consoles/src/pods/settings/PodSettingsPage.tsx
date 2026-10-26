import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Box, Divider, Snackbar, Stack, Typography } from '@mui/material';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import PodLifecycleSettings from './PodLifecycleSettings';
import PodReminderSettings from './PodReminderSettings';
import AutoPodSettings from './AutoPodSettings';
import RequestChangeSettings from './RequestChangeSettings';
import VenueOfferCounterSettings from './VenueOfferCounterSettings';
import { POD_SETTINGS, UPDATE_POD_SETTINGS } from './queries';

/**
 * Admin > Pods > Pod Settings — the platform defaults every pod is created
 * and run under.
 *
 * Five groups, each its own file: the pod's own lifecycle (drafts, backouts,
 * venue cancellations, attendance verification, the auto-cancel sweep), the
 * windows the reminder sweeps fire on, the Auto Pods windows, the Request Change
 * deductions, and how far a host and a venue may bargain over a booking. The page itself is the
 * query, the save and the order they appear in — anything more and it passes
 * the 200-line ceiling (rule 9), which is exactly what happened before.
 *
 * (The Duncit Coin earn rate used to sit here too; it moved to Finance >
 * Duncit Coin > Settings with the rest of the coin payout rules.)
 */
export default function PodSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(POD_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation<any>(UPDATE_POD_SETTINGS, {
    refetchQueries: [{ query: PUBLIC_APP_SETTINGS }],
  });
  const [toast, setToast] = useState<string | null>(null);

  const settings = data?.appSettings;

  const onSave = async (input: Record<string, unknown>) => {
    await save({ variables: { input } });
    setToast(t('admin.podSettings.saved'));
    await refetch();
  };

  const section = { settings, loading, onSave };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h1" data-testid="pod-settings-title">{t('admin.podSettings.title')}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.podSettings.subtitle')}
        </Typography>
      </Box>

      {/* The server's own reason (e.g. a role that may not read platform
          settings) — without it every card below reads as merely out of range. */}
      {error && (
        <Alert severity="error" data-testid="pod-settings-error">
          <AlertTitle>{t('shell.table.loadFailed')}</AlertTitle>
          {error.message}
        </Alert>
      )}

      <PodLifecycleSettings {...section} />
      <Divider />
      <PodReminderSettings {...section} />
      <Divider />
      <AutoPodSettings {...section} />
      <Divider />
      <RequestChangeSettings {...section} />
      <Divider />
      <VenueOfferCounterSettings {...section} />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
