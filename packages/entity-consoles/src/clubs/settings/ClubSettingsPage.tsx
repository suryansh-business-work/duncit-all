import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import NumberSettingCard from '../../pods/settings/NumberSettingCard';

/** The query and the save select the same fields, so the cache Apollo writes
 * back from the save matches what the page reads (see the Pod Settings twin). */
const FIELDS = `
  club_chat_retention_days
  updated_at
`;

export const CLUB_SETTINGS = gql`
  query ClubSettings {
    appSettings { ${FIELDS} }
  }
`;

export const UPDATE_CLUB_SETTINGS = gql`
  mutation UpdateClubSettings($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) { ${FIELDS} }
  }
`;

interface ClubSettingsData {
  appSettings: { club_chat_retention_days: number; updated_at?: string | null } | null;
}

/**
 * Clubs > Club Settings — the platform defaults every club runs under. Today
 * that is how long a club's chat keeps a message: a club never ends, so its
 * room ages messages out instead of being deleted whole like a pod's.
 */
export default function ClubSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<ClubSettingsData>(CLUB_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE_CLUB_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const settings = data?.appSettings;

  const onSave = async (input: Record<string, number>) => {
    await save({ variables: { input } });
    setToast(t('admin.clubSettings.saved'));
    await refetch();
  };

  return (
    <Stack spacing={3} data-testid="club-settings-page">
      <Box>
        <Typography variant="h5" component="h1">{t('admin.clubSettings.title')}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.clubSettings.subtitle')}
        </Typography>
      </Box>
      <NumberSettingCard
        title={t('admin.clubSettings.chatRetentionTitle')}
        description={t('admin.clubSettings.chatRetentionDesc')}
        label={t('admin.clubSettings.chatRetentionLabel')}
        helperText={t('admin.clubSettings.chatRetentionMin')}
        invalidText={t('admin.clubSettings.chatRetentionInvalid')}
        min={1}
        max={3650}
        loading={loading}
        value={settings?.club_chat_retention_days ?? null}
        onSave={(next) => onSave({ club_chat_retention_days: next })}
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
