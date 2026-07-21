import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import NumberSettingCard from './pod-settings/NumberSettingCard';

const POD_SETTINGS = gql`
  query PodSettings {
    appSettings {
      draft_retention_days
      max_backout_attempts
      updated_at
    }
  }
`;

const UPDATE_POD_SETTINGS = gql`
  mutation UpdatePodSettings($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      draft_retention_days
      max_backout_attempts
      updated_at
    }
  }
`;

/** Admin > Pods > Pod Settings — platform defaults for the Create-a-Pod flow:
 * the draft-pod retention window (daily cleanup job + Host Studio note) and the
 * per-user-per-pod Backout attempt limit enforced by the backout flow. */
export default function PodSettingsPage() {
  const { data, loading, refetch } = useQuery(POD_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save] = useMutation(UPDATE_POD_SETTINGS, {
    refetchQueries: [{ query: PUBLIC_APP_SETTINGS }],
  });
  const [toast, setToast] = useState<string | null>(null);

  const settings = data?.appSettings;

  const saveField = async (input: Record<string, number>) => {
    await save({ variables: { input } });
    setToast('Pod settings saved');
    await refetch();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Pod Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Platform-level defaults for the Create-a-Pod flow.
        </Typography>
      </Box>
      <NumberSettingCard
        title="Draft Pod Retention Period (Days)"
        description="Defines how many days a Pod can remain in Draft before permanent deletion. Changes apply only to unexpired Draft Pods."
        label="Draft Pod Retention Period (Days)"
        helperText="Minimum 1 day. Default 3."
        invalidText="Enter a whole number of 1 or more."
        min={1}
        loading={loading}
        value={settings?.draft_retention_days ?? null}
        onSave={(next) => saveField({ draft_retention_days: next })}
      />
      <NumberSettingCard
        title="Maximum Backout Attempts per User Per Pod"
        description="Set the maximum number of Backout attempts a user can initiate for the same Pod. Each successful 'Backout in process' counts as one attempt; once the limit is reached the Backout action is blocked for that Pod."
        label="Maximum Backout Attempts per User Per Pod"
        helperText="Minimum 1 attempt. Default 3."
        invalidText="Enter a whole number of 1 or more."
        min={1}
        loading={loading}
        value={settings?.max_backout_attempts ?? null}
        onSave={(next) => saveField({ max_backout_attempts: next })}
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
