import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { partnerPortalUrl } from '@duncit/onboarding';
import { mwebCurrentLabel, mwebMeetingLabels } from '@duncit/slots';
import {
  EarnJourneyList,
  EarnSurfaceProvider,
  mwebEarnMeetingLabels,
  type EarnSurfaceConfig,
} from '@duncit/earn';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useTranslation } from '../../i18n/useTranslation';

/** "Earn with Duncit" — the shared journey cards (@duncit/earn) with mWeb's
 * page chrome and navigation: surveys are in-app routes, approved venue/brand/
 * club CTAs deep-link to the Partner Portal (preserved through login). */
export default function EarnPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // The product-seller path is hidden when products are gated off — mirrors the
  // native EarnScreen so all three platforms behave identically.
  const showProducts = useFeatureFlag('is_product_visible');

  const config = useMemo<EarnSurfaceConfig>(
    () => ({
      openJourney: (journey) => navigate(journey.surveyPath),
      runCta: (cta) => {
        if (cta.target === 'internal') {
          navigate(cta.internalTo);
          return;
        }
        globalThis.window.location.replace(partnerPortalUrl(cta.partnerPath));
      },
      meetingSlotLabels: (rescheduling) => mwebMeetingLabels(t, rescheduling),
      currentSlotBadge: mwebCurrentLabel(t),
      meetingLabels: mwebEarnMeetingLabels(t),
    }),
    [navigate, t],
  );

  return (
    <Stack
      spacing={2}
      sx={{ maxWidth: 720, mx: 'auto', width: '100%', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}
    >
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">
          {t('mweb.common.back')}
        </Button>
      </Box>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('mweb.earn.earnWithDuncit')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          {t('mweb.earn.subtitle')}
        </Typography>
      </Stack>
      <EarnSurfaceProvider config={config}>
        <EarnJourneyList showProducts={showProducts} />
      </EarnSurfaceProvider>
    </Stack>
  );
}
