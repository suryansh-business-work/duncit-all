import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import { DuncitButton } from '@duncit/buttons';
import { EARN_JOURNEYS } from '@duncit/onboarding';
import { launchSectionMedia, type LaunchPageMedia, type LaunchRoleDefinition } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { LAUNCH_BADGE_ICONS } from './launchIcons';
import { LaunchBadge, LaunchFooterLine, LaunchGlass, LaunchHeadline, LaunchTagline } from './LaunchGlass';
import { LaunchItemDiscs, LaunchItemPills, LaunchItemStrip } from './LaunchItems';
import LaunchSection from './LaunchSection';

const surveyPathOf = (kind: string) => EARN_JOURNEYS.find((journey) => journey.kind === kind)?.surveyPath ?? '/earn';

interface Props {
  role: LaunchRoleDefinition;
  media: LaunchPageMedia;
  minHeight: number;
}

/**
 * One of the three ways to help a city launch — hosting, a venue, running a
 * club — as a full screen: the aside and headline over the role's video, its
 * chips, then the glass card with the badge, the pitch, the stats and "Tell
 * me more", which opens the role's Earn journey. Native twin:
 * components/city-launch/CityLaunchRoleSection.
 */
export default function CityLaunchRoleSection({ role, media, minHeight }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const title = t(role.titleKey);
  const cta = t('mweb.cityLaunch.tellMeMore');
  const chips = role.chips.length > 0 ? (
    <LaunchItemPills items={role.chips} testId={`${role.testId}-chips`} inline={role.section === 'club_admin'} />
  ) : null;
  const stats =
    role.statsLayout === 'strip' ? (
      <LaunchItemStrip items={role.stats} testId={`${role.testId}-stats`} />
    ) : (
      <LaunchItemDiscs items={role.stats} testId={`${role.testId}-stats`} />
    );

  return (
    <LaunchSection testId={role.testId} media={launchSectionMedia(media, role.section)} minHeight={minHeight}>
      <Stack spacing={2}>
        <LaunchTagline>{t(role.taglineKey)}</LaunchTagline>
        <LaunchHeadline testId={`${role.testId}-title`}>{title}</LaunchHeadline>
        {role.subtitleKey ? (
          <Typography sx={{ fontSize: 16, lineHeight: 1.4, opacity: 0.92 }}>{t(role.subtitleKey)}</Typography>
        ) : null}
        {chips}
      </Stack>

      <Stack spacing={2}>
        <Stack sx={{ position: 'relative', pt: 2.25 }}>
          <Stack sx={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 1 }}>
            <LaunchBadge icon={LAUNCH_BADGE_ICONS[role.section]} label={t(role.eyebrowKey)} testId={`${role.testId}-badge`} />
          </Stack>
          <LaunchGlass sx={{ pt: 4 }}>
            <Stack spacing={2}>
              {role.cardTitleKey ? (
                <Typography component="h3" sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15, textAlign: 'center' }}>
                  {t(role.cardTitleKey)}
                </Typography>
              ) : null}
              {role.cardBodyKey ? (
                <Typography sx={{ fontSize: 15, lineHeight: 1.45, textAlign: 'center', opacity: 0.92 }}>
                  {t(role.cardBodyKey)}
                </Typography>
              ) : null}
              {stats}
              <DuncitButton
                data-testid={`${role.testId}-cta`}
                variant="contained"
                size="large"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                aria-label={t('mweb.a11y.actionFor', { vars: { action: cta, name: title } })}
                onClick={() => navigate(surveyPathOf(role.kind))}
              >
                {cta}
              </DuncitButton>
            </Stack>
          </LaunchGlass>
        </Stack>
        {role.footerKey ? <LaunchFooterLine testId={`${role.testId}-footer`}>{t(role.footerKey)}</LaunchFooterLine> : null}
      </Stack>
    </LaunchSection>
  );
}
