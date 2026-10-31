import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { POD_PROMO_SETTINGS, UPDATE_POD_PROMO_SETTINGS, type PodPromoSettings } from '../queries';
import { PromoSettingsForm, type PromoSettingsFormValues } from '../promo-settings-form';
import { useSettingsOptions } from './useSettingsOptions';

/** The settings card: read by everyone on the page, saved only by a manager. */
export default function SettingsCard({ canManage }: Readonly<{ canManage: boolean }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ podPromoSettings: PodPromoSettings }>(POD_PROMO_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const { options, error: optionsError } = useSettingsOptions();
  const [save, saveState] = useMutation<{ updatePodPromoSettings: PodPromoSettings }>(UPDATE_POD_PROMO_SETTINGS, {
    refetchQueries: ['PodPromoSettings'],
  });
  const settings = data?.podPromoSettings;

  const submit = async (input: PromoSettingsFormValues) => {
    try {
      await save({ variables: { input } });
      notify(t('marketing.podPromo.settingsSaved'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <SectionCard title={t('marketing.podPromo.settingsTitle')} subtitle={t('marketing.podPromo.settingsSubtitle')}>
      <Stack spacing={2} data-tour="pod-promo-settings" data-testid="pod-promo-settings">
        {loading && !settings && <LinearProgress aria-label={t('marketing.podPromo.loadingSettings')} />}
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}
        {optionsError && <Alert severity="warning">{t('marketing.podPromo.optionsFailed')}</Alert>}
        {!canManage && settings && <Alert severity="info">{t('marketing.podPromo.readOnlySettings')}</Alert>}
        {settings && (
          <>
            <PromoSettingsForm settings={settings} options={options} readOnly={!canManage} busy={saveState.loading} onSubmit={submit} />
            {settings.updated_by_name && (
              <Typography variant="caption" color="text.secondary">
                {t('marketing.podPromo.filedUnder', { vars: { name: settings.updated_by_name } })}
              </Typography>
            )}
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
