import { useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Box, Link, Stack, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { useTranslation } from '@duncit/app-settings';
import { shellCurrentLabel, shellMeetingLabels } from '@duncit/slots';
import {
  EARN_KINDS,
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

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The one journey this page is opened ON, if any.
 *
 * The Partners sidebar gives a not-yet-partner a single entry under the Host and
 * E-Commerce Brand groups ("Be a Host", "Become an E-Commerce Brand Partner"),
 * and somebody who picked one has already chosen: landing them on the four-card
 * menu makes them choose again.
 */
export type EarnFocus = 'HOST' | 'ECOMM';

/** Heading for the page: the sidebar entry that opened it, or the hub's own. */
function focusTitle(t: Translate, focus?: EarnFocus): string {
  if (focus === 'HOST') return t('shell.nav.beAHost');
  if (focus === 'ECOMM') return t('shell.nav.becomeAnECommerceBrandPartner');
  return t('partners.earn.title');
}

function focusSubtitle(t: Translate, focus?: EarnFocus): string {
  if (focus) return t('partners.earn.focusSubtitle');
  return t('partners.earn.subtitle');
}

/** "Earn with Duncit" — the shared journey cards (@duncit/earn) inside the
 * Partners shell. Same cards and lock rules as mWeb/native; navigation
 * inverts: `partner` CTA paths are THIS portal's own routes, while surveys and
 * the host CTA open on mWeb.
 *
 * `focus` narrows the page to one journey without changing any of that: the
 * card, its locked/pending/approved state and its actions are the same ones the
 * full list renders. */
export default function EarnPage({ focus }: Readonly<{ focus?: EarnFocus }>) {
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

  const kinds = focus ? [focus] : EARN_KINDS;

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
            {focusTitle(t, focus)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            {focusSubtitle(t, focus)}
          </Typography>
        </Box>
      </Stack>
      <EarnSurfaceProvider config={config}>
        <EarnJourneyList showProducts={showProducts} kinds={kinds} />
      </EarnSurfaceProvider>
      {focus && (
        <Link component={RouterLink} to="/earn" variant="body2" sx={{ fontWeight: 700 }}>
          {t('partners.earn.seeAllWays')}
        </Link>
      )}
    </Stack>
  );
}
