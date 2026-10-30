import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import PageHeading from '../../components/PageHeading';
import DetailPageState from '../../components/detail/DetailPageState';
import { useCanWrite } from '../../lib/roles';
import SmartIncentiveSettingsForm from './settings';
import {
  SMART_INCENTIVE_SETTINGS,
  UPDATE_SMART_INCENTIVE_SETTINGS,
  type SmartIncentiveSettings,
  type SmartIncentiveSettingsInput,
} from './queries';

/** Remounting the form on the saved values makes them its new baseline, so Save disables until the next edit. */
const formKey = (settings: SmartIncentiveSettings) =>
  `${settings.enabled}|${settings.delay_seconds}|${settings.max_discount_pct}`;

/**
 * Loyalty > Smart Incentive > Settings — switch the programme on or off, choose
 * when the offer pops up, and cap the discount a host may offer. The server
 * gates the save (LOYALTY_ADMIN_WRITE); a read-only seat sees a disabled form.
 */
export default function SmartIncentiveSettingsPage() {
  const { t } = useTranslation();
  const canWrite = useCanWrite();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ smartIncentiveSettings: SmartIncentiveSettings }>(
    SMART_INCENTIVE_SETTINGS,
    { fetchPolicy: 'cache-and-network' }
  );
  const [update, { loading: saving }] = useMutation<
    { updateSmartIncentiveSettings: SmartIncentiveSettings },
    { input: SmartIncentiveSettingsInput }
  >(UPDATE_SMART_INCENTIVE_SETTINGS, {
    // The settings have no id to normalise on, so the saved values are written
    // over the cached read by hand rather than fetched a second time.
    update(cache, { data: saved }) {
      if (saved) {
        cache.writeQuery({
          query: SMART_INCENTIVE_SETTINGS,
          data: { smartIncentiveSettings: saved.updateSmartIncentiveSettings },
        });
      }
    },
  });
  const settings = data?.smartIncentiveSettings;

  const save = async (input: SmartIncentiveSettingsInput) => {
    setSaveError(null);
    try {
      await update({ variables: { input } });
      notifySuccess(t('loyalty.smartIncentive.saved'));
    } catch (e) {
      setSaveError(parseApiError(e, t('loyalty.smartIncentive.saveError')));
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeading
        icon={<TuneIcon color="primary" sx={{ fontSize: 28 }} />}
        title={t('loyalty.smartIncentive.settingsTitle')}
        subtitle={t('loyalty.smartIncentive.settingsSubtitle')}
      />
      <Alert severity="info">{t('loyalty.smartIncentive.settingsNote')}</Alert>
      <DetailPageState loading={loading && !settings} error={error} notFound={false} onRetry={() => refetch()}>
        {settings && (
          <SmartIncentiveSettingsForm
            key={formKey(settings)}
            settings={settings}
            canWrite={canWrite}
            busy={saving}
            errorMessage={saveError}
            onSubmit={save}
          />
        )}
      </DetailPageState>
    </Stack>
  );
}
