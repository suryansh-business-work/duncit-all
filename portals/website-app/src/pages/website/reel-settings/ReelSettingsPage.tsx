import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Paper, Skeleton, Stack } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  UPDATE_WEBSITE_REEL_SETTINGS,
  WEBSITE_REEL_SETTINGS,
  type WebsiteReelSettingsData,
} from '../reels/queries';
import { ReelSettingsForm, type ReelSettingsFormOutput } from './reel-settings-form';

/** Reel Slider Settings — the max reel size and the max reels per website. */
export default function ReelSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<WebsiteReelSettingsData>(WEBSITE_REEL_SETTINGS);
  const [update] = useMutation<{ updateWebsiteReelSettings: WebsiteReelSettingsData['websiteReelSettings'] }>(
    UPDATE_WEBSITE_REEL_SETTINGS,
    {
      update(cache, { data: result }) {
        if (!result) return;
        cache.writeQuery({
          query: WEBSITE_REEL_SETTINGS,
          data: { websiteReelSettings: result.updateWebsiteReelSettings },
        });
      },
    },
  );
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async (input: ReelSettingsFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      await update({ variables: { input } });
      notifySuccess(t('websiteApp.reels.settings.saved'));
    } catch {
      setSaveError(t('websiteApp.reels.settings.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const settings = data?.websiteReelSettings;

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('websiteApp.reels.settings.title')}
        subtitle={t('websiteApp.reels.settings.subtitle')}
        titleWeight={700}
      />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        {loading && <Skeleton variant="rounded" height={160} sx={{ maxWidth: 480 }} />}
        {error && !loading && <Alert severity="error">{t('websiteApp.reels.settings.loadFailed')}</Alert>}
        {settings && (
          <ReelSettingsForm
            key={settings.updated_at}
            settings={settings}
            submitting={submitting}
            errorMessage={saveError}
            onSubmit={(values) => {
              save(values).catch(() => setSaveError(t('websiteApp.reels.settings.saveFailed')));
            }}
          />
        )}
      </Paper>
    </Stack>
  );
}
