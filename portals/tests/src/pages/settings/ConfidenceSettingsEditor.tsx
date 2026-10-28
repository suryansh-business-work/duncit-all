import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, Skeleton, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import type { UpdateTestsSettingsInput } from '@duncit/gql-types';
import { fireAndForget } from '@duncit/logs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { ConfidenceSettingsForm } from './confidence-settings';
import {
  TESTS_SETTINGS,
  UPDATE_TESTS_SETTINGS,
  type TestsSettingsData,
  type UpdateTestsSettingsData,
} from './queries';
import { TESTS_OVERVIEW } from '../dashboard/queries';
import { testsLog } from '../../lib/logger';

/** Loads the confidence settings, saves them, and says who changed them last. */
export default function ConfidenceSettingsEditor() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<TestsSettingsData>(TESTS_SETTINGS);
  const [update, { loading: saving }] = useMutation<UpdateTestsSettingsData, { input: UpdateTestsSettingsInput }>(
    UPDATE_TESTS_SETTINGS,
    {
      // The settings have no id to normalise on, so the saved values are written
      // back over the read by hand; the dashboard's score is re-read on its next visit.
      update(cache, { data: saved }) {
        if (saved) cache.writeQuery({ query: TESTS_SETTINGS, data: { testsSettings: saved.updateTestsSettings } });
      },
      refetchQueries: [{ query: TESTS_OVERVIEW }],
    }
  );
  const settings = data?.testsSettings;

  const save = async (input: UpdateTestsSettingsInput) => {
    setSaveError(null);
    try {
      await update({ variables: { input } });
      notifySuccess(t('tests.settings.confidence.saved'));
    } catch (err) {
      setSaveError(parseApiError(err, t('tests.settings.confidence.saveFailed')));
    }
  };

  return (
    <SectionCard title={t('tests.settings.confidence.title')} subtitle={t('tests.settings.confidence.subtitle')}>
      {error && !settings && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => fireAndForget(refetch(), testsLog, '/settings', 'ConfidenceSettingsEditor')}>
              {t('tests.common.retry')}
            </Button>
          }
        >
          {t('tests.settings.confidence.loadFailed')}
        </Alert>
      )}
      {loading && !settings && <Skeleton variant="rounded" height={240} />}
      {settings && (
        <Stack spacing={2}>
          <ConfidenceSettingsForm settings={settings} saving={saving} errorMessage={saveError} onSubmit={save} />
          {settings.updated_by && settings.updated_at && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('tests.settings.confidence.updatedBy', {
                vars: { who: settings.updated_by, when: formatDateTime(settings.updated_at) },
              })}
            </Typography>
          )}
        </Stack>
      )}
    </SectionCard>
  );
}
