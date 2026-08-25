import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { useTranslation } from '@duncit/app-settings';
import { shellCurrentLabel, shellMeetingLabels } from '@duncit/slots';
import {
  EarnJourneyList,
  EarnSurfaceProvider,
  shellEarnMeetingLabels,
  useEarnProductsVisible,
  type EarnSurfaceConfig,
} from '@duncit/earn';
import { urlConfigs } from '../../config/url-configs';

/** The application/survey flow lives on mWeb; only approved next steps live here. */
const openOnMweb = (path: string) => {
  globalThis.open(`${urlConfigs.mwebUrl}${path}`, '_blank', 'noopener,noreferrer');
};

/** "Earn with Duncit" — the shared journey cards (@duncit/earn) inside the
 * Partners shell. Same cards and lock rules as mWeb/native; navigation
 * inverts: `partner` CTA paths are THIS portal's own routes, while surveys and
 * the host CTA open on mWeb. */
export default function EarnPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const showProducts = useEarnProductsVisible();

  const config = useMemo<EarnSurfaceConfig>(
    () => ({
      openJourney: (journey) => openOnMweb(journey.surveyPath),
      runCta: (cta) => {
        if (cta.target === 'internal') {
          openOnMweb(cta.internalTo);
          return;
        }
        navigate(cta.partnerPath);
      },
      meetingSlotLabels: (rescheduling) => shellMeetingLabels(t, rescheduling),
      currentSlotBadge: shellCurrentLabel(t),
      meetingLabels: shellEarnMeetingLabels(t),
    }),
    [navigate, t],
  );

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto', width: '100%', pb: 4 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <VolunteerActivismIcon color="primary" />
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              lineHeight: 1
            }}>
            {t('partners.earn.title')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            {t('partners.earn.subtitle')}
          </Typography>
        </Box>
      </Stack>
      <EarnSurfaceProvider config={config}>
        <EarnJourneyList showProducts={showProducts} />
      </EarnSurfaceProvider>
    </Stack>
  );
}
