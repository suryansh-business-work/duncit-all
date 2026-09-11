import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import { EARN_KINDS, partnerPortalUrl } from '@duncit/onboarding';
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

  // The calm inner-page header — a 40px round back button and the title at
  // 17/600, no subtitle — the same strip the native StackScreen draws.
  return (
    <Stack
      spacing={1.5}
      sx={{ maxWidth: 720, mx: 'auto', width: '100%', px: 2, py: 1, pb: { xs: 10, sm: 8 } }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DuncitRoundButton
          onClick={() => navigate(-1)}
          aria-label={t('mweb.common.back')}
          sx={{ width: 40, height: 40, minWidth: 40, minHeight: 40, bgcolor: 'background.paper', color: 'text.primary' }}
        >
          <ArrowBackRoundedIcon />
        </DuncitRoundButton>
        <Typography
          component="h1"
          noWrap
          sx={{ flex: 1, minWidth: 0, fontSize: '1.0625rem', fontWeight: 600 }}
        >
          {t('mweb.earn.earnWithDuncit')}
        </Typography>
      </Stack>
      <EarnSurfaceProvider config={config}>
        <EarnJourneyList showProducts={showProducts} kinds={EARN_KINDS} />
      </EarnSurfaceProvider>
    </Stack>
  );
}
