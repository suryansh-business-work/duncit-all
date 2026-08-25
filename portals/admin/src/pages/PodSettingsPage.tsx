import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import NumberSettingCard from './pod-settings/NumberSettingCard';
import ToggleSettingCard from './pod-settings/ToggleSettingCard';
import { useTranslation } from '@duncit/shell';

const POD_SETTINGS = gql`
  query PodSettings {
    appSettings {
      draft_retention_days
      max_backout_attempts
      venue_cancel_health_penalty
      attendance_otp_required
      updated_at
    }
  }
`;

const UPDATE_POD_SETTINGS = gql`
  mutation UpdatePodSettings($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      draft_retention_days
      max_backout_attempts
      venue_cancel_health_penalty
      attendance_otp_required
      updated_at
    }
  }
`;

/** Admin > Pods > Pod Settings — platform defaults for the Create-a-Pod flow:
 * the draft-pod retention window (daily cleanup job + Host Studio note), the
 * per-user-per-pod Backout attempt limit enforced by the backout flow, the
 * and the Account Health penalty a venue pays when its owner cancels a booked
 * pod. (The Duncit Coin earn rate used to sit here too; it moved to Finance >
 * Duncit Coin > Settings, with the rest of the coin payout rules.) */
export default function PodSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery(POD_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save] = useMutation(UPDATE_POD_SETTINGS, {
    refetchQueries: [{ query: PUBLIC_APP_SETTINGS }],
  });
  const [toast, setToast] = useState<string | null>(null);

  const settings = data?.appSettings;

  const saveField = async (input: Record<string, number | boolean>) => {
    await save({ variables: { input } });
    setToast(t('admin.podSettings.saved'));
    await refetch();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{t('admin.podSettings.title')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Platform-level defaults for the Create-a-Pod flow.
        </Typography>
      </Box>
      <NumberSettingCard
        title={t('admin.podSettings.retentionLabel')}
        description={t('admin.podSettings.retentionHint')}
        label={t('admin.podSettings.retentionLabel')}
        helperText={t('admin.podSettings.retentionMin')}
        invalidText="Enter a whole number of 1 or more."
        min={1}
        loading={loading}
        value={settings?.draft_retention_days ?? null}
        onSave={(next) => saveField({ draft_retention_days: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.backoutLabel')}
        description="Set the maximum number of Backout attempts a user can initiate for the same Pod. Each successful 'Backout in process' counts as one attempt; once the limit is reached the Backout action is blocked for that Pod."
        label={t('admin.podSettings.backoutLabel')}
        helperText={t('admin.podSettings.backoutMin')}
        invalidText="Enter a whole number of 1 or more."
        min={1}
        loading={loading}
        value={settings?.max_backout_attempts ?? null}
        onSave={(next) => saveField({ max_backout_attempts: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.penaltyTitle')}
        description="Points deducted from a venue's Account Health each time its owner cancels a pod booked at that venue. Set 0 to disable the penalty."
        label={t('admin.podSettings.penaltyLabel')}
        helperText={t('admin.podSettings.penaltyMin')}
        invalidText="Enter a whole number of 0 or more."
        min={0}
        loading={loading}
        value={settings?.venue_cancel_health_penalty ?? null}
        onSave={(next) => saveField({ venue_cancel_health_penalty: next })}
      />
      <ToggleSettingCard
        title={t('admin.podSettings.otpTitle')}
        description="When on, a host marking an attendee present by hand must first verify that attendee's name and phone number with a one-time code. Scanning a ticket is proof on its own and is never gated by this, and a Club Admin's override never asks for a code either."
        onHint="On — the host verifies the attendee's number before the Mark Attendance button unlocks."
        offHint="Off — the host can mark an attendee present without verifying their number."
        loading={loading}
        value={settings?.attendance_otp_required ?? null}
        onSave={(next) => saveField({ attendance_otp_required: next })}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
