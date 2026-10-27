import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Button, Skeleton } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import type { UnitTestSettings, UpdateUnitTestSettingsInput } from '@duncit/gql-types';
import { fireAndForget } from '@duncit/logs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { testsLog } from '../../lib/logger';
import { UnitRetentionForm } from './unit-retention';

const RETENTION_FIELDS = `retention_runs min_retention_runs max_retention_runs`;

const UNIT_TEST_SETTINGS = gql`
  query UnitTestSettings {
    unitTestSettings { ${RETENTION_FIELDS} }
  }
`;

const UPDATE_UNIT_TEST_SETTINGS = gql`
  mutation UpdateUnitTestSettings($input: UpdateUnitTestSettingsInput!) {
    updateUnitTestSettings(input: $input) { ${RETENTION_FIELDS} }
  }
`;

/** Both documents select every field of the type, so the generated type is exact. */
interface SettingsData {
  unitTestSettings: UnitTestSettings;
}
interface UpdateData {
  updateUnitTestSettings: UnitTestSettings;
}

/** Loads and saves how long unit test detail is kept. */
export default function UnitRetentionEditor() {
  const { t } = useTranslation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<SettingsData>(UNIT_TEST_SETTINGS);
  const [update, { loading: saving }] = useMutation<UpdateData, { input: UpdateUnitTestSettingsInput }>(
    UPDATE_UNIT_TEST_SETTINGS,
    {
      update(cache, { data: saved }) {
        if (saved) cache.writeQuery({ query: UNIT_TEST_SETTINGS, data: { unitTestSettings: saved.updateUnitTestSettings } });
      },
    }
  );
  const settings = data?.unitTestSettings;

  const save = async (input: UpdateUnitTestSettingsInput) => {
    setSaveError(null);
    try {
      await update({ variables: { input } });
      notifySuccess(t('tests.settings.retention.saved'));
    } catch (err) {
      setSaveError(parseApiError(err, t('tests.settings.retention.saveFailed')));
    }
  };

  return (
    <SectionCard title={t('tests.settings.retention.title')} subtitle={t('tests.settings.retention.subtitle')}>
      {error && !settings && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => fireAndForget(refetch(), testsLog, '/settings', 'UnitRetentionEditor')}>
              {t('tests.common.retry')}
            </Button>
          }
        >
          {t('tests.settings.retention.loadFailed')}
        </Alert>
      )}
      {loading && !settings && <Skeleton variant="rounded" height={96} />}
      {settings && <UnitRetentionForm settings={settings} saving={saving} errorMessage={saveError} onSubmit={save} />}
    </SectionCard>
  );
}
