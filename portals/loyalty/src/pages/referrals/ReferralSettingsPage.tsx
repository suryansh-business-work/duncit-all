import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import DetailPageState from '../../components/detail/DetailPageState';
import PageHeading from '../../components/PageHeading';
import { urlConfigs } from '../../config/url-configs';
import { useCanWrite } from '../../lib/roles';
import ReferralSettingsForm, { type ReferralSettingsValues } from './settings';
import { REFERRAL_SETTINGS, UPDATE_REFERRAL_SETTINGS, type ReferralSettings } from './queries';

/** Loyalty > Refer & Earn > Settings — the message members share and the gift line their screen shows. */
export default function ReferralSettingsPage() {
  const { t } = useTranslation();
  const canWrite = useCanWrite();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ referralSettings: ReferralSettings }>(REFERRAL_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [update, { loading: saving }] = useMutation<{ updateReferralSettings: ReferralSettings }>(
    UPDATE_REFERRAL_SETTINGS,
    { refetchQueries: [{ query: REFERRAL_SETTINGS }], awaitRefetchQueries: true }
  );
  const settings = data?.referralSettings;

  const submit = async (values: ReferralSettingsValues) => {
    setErrorMessage(null);
    try {
      await update({ variables: { input: values } });
      notifySuccess(t('loyalty.referrals.saved'));
    } catch (e) {
      setErrorMessage(parseApiError(e, t('loyalty.referrals.saveError')));
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeading
        icon={<TuneIcon color="primary" sx={{ fontSize: 28 }} />}
        title={t('loyalty.referrals.settingsTitle')}
        subtitle={t('loyalty.referrals.settingsSubtitle')}
      />
      <Alert severity="info">{t('loyalty.referrals.settingsNote')}</Alert>
      <DetailPageState
        loading={loading && !settings}
        error={error}
        notFound={false}
        onRetry={() => refetch()}
      >
        {settings && (
          <ReferralSettingsForm
            // A save re-reads the settings; remounting on the saved values makes
            // them the form's new baseline, so Save disables until the next edit.
            key={`${settings.share_message}|${settings.gift_description}`}
            settings={settings}
            signupBaseUrl={urlConfigs.mwebUrl}
            busy={saving}
            canWrite={canWrite}
            errorMessage={errorMessage}
            onSubmit={submit}
          />
        )}
      </DetailPageState>
    </Stack>
  );
}
