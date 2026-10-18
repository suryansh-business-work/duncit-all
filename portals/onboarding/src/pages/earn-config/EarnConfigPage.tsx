import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { QueryGuard } from '@duncit/ui';
import { notifySuccess, notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import {
  BLANK_EARN_CARD_IMAGES,
  EARN_CARD_IMAGES,
  EarnCardImagesForm,
  UPDATE_EARN_CARD_IMAGES,
  type EarnCardImagesQueryResult,
  type EarnCardImagesValues,
} from './earn-card-images';

/** Onboarding Portal > Earn with Duncit: the featured image on each Earn card
 * that mWeb, native and the Partners portal show. */
export default function EarnConfigPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<EarnCardImagesQueryResult>(EARN_CARD_IMAGES, {
    fetchPolicy: 'cache-and-network',
  });
  const [update, { loading: saving }] = useMutation<EarnCardImagesQueryResult>(UPDATE_EARN_CARD_IMAGES);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (values: EarnCardImagesValues) => {
    setSaveError(null);
    try {
      await update({ variables: { input: { earn_card_images: values } } });
      notifySuccess(t('onboarding.earnConfigPage.saved'));
    } catch (e) {
      const message = e instanceof Error ? e.message : t('onboarding.earnConfigPage.saveFailed');
      setSaveError(message);
      notifyError(message);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 1120 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <VolunteerActivismIcon color="primary" />
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {t('onboarding.earnConfigPage.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('onboarding.earnConfigPage.subtitle')}
          </Typography>
        </Box>
      </Stack>
      <QueryGuard loading={loading && !data} error={error}>
        {saveError && <Alert severity="error">{saveError}</Alert>}
        <EarnCardImagesForm
          defaultValues={data?.onboardingIntro.earn_card_images ?? BLANK_EARN_CARD_IMAGES}
          saving={saving}
          onSubmit={handleSubmit}
        />
      </QueryGuard>
    </Stack>
  );
}
