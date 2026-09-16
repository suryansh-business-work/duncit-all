import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { QueryGuard } from '@duncit/ui';
import { notifySuccess, notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import {
  BLANK_ONBOARDING_INTRO,
  ONBOARDING_INTRO_SETTINGS,
  OnboardingIntroSettingsForm,
  UPDATE_ONBOARDING_INTRO_SETTINGS,
  type OnboardingIntroQueryResult,
  type OnboardingIntroSettingsValues,
} from './onboarding-intro-settings';

/** Onboarding Portal > Settings: the per-role intro copy shown first on each
 * of the four onboarding flows (native + mWeb), before the category picker. */
export default function OnboardingSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<OnboardingIntroQueryResult>(ONBOARDING_INTRO_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [update, { loading: saving }] = useMutation<OnboardingIntroQueryResult>(
    UPDATE_ONBOARDING_INTRO_SETTINGS,
  );

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (values: OnboardingIntroSettingsValues) => {
    setSaveError(null);
    try {
      await update({ variables: { input: values } });
      notifySuccess(t('onboarding.settingsPage.saved'));
    } catch (e) {
      const message = e instanceof Error ? e.message : t('onboarding.settingsPage.saveFailed');
      setSaveError(message);
      notifyError(message);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <SettingsIcon color="primary" />
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {t('onboarding.settingsPage.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('onboarding.settingsPage.subtitle')}
          </Typography>
        </Box>
      </Stack>
      <QueryGuard loading={loading && !data} error={error}>
        {saveError && <Alert severity="error">{saveError}</Alert>}
        <OnboardingIntroSettingsForm
          defaultValues={data?.onboardingIntro ?? BLANK_ONBOARDING_INTRO}
          saving={saving}
          onSubmit={handleSubmit}
        />
      </QueryGuard>
    </Stack>
  );
}
