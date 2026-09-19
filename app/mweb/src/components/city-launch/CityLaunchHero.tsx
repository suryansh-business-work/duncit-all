import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { LAUNCH_HERO_FEATURES, LAUNCH_HERO_TRUST, launchSectionMedia } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import CityLaunchAdded from './CityLaunchAdded';
import CityLaunchCount from './CityLaunchCount';
import CityLaunchNotify from './CityLaunchNotify';
import { LaunchFooterLine, LaunchHeadline, LaunchTagline } from './LaunchGlass';
import { LaunchItemStrip } from './LaunchItems';
import LaunchSection from './LaunchSection';
import type { CityLaunchStatus } from './queries';

interface Props {
  status: CityLaunchStatus;
  city: string;
  /** What the page was opened with — the slug or id the subscribe mutation names the city by. */
  locationId: string;
  minHeight: number;
  /** The standalone route's back bar, drawn over the top of the backdrop. */
  header?: ReactNode;
}

/**
 * The first screen: "{city}, are you in?" over the admin's video, the four
 * promises, the live count and the way to the launch goal, then the button
 * that adds your name (or what to do once it is added), the three
 * reassurances and the closing line. Native twin:
 * components/city-launch/CityLaunchHero.
 */
export default function CityLaunchHero({ status, city, locationId, minHeight, header }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <LaunchSection
      testId="city-launch-hero"
      media={launchSectionMedia(status.launch_media, 'hero')}
      minHeight={minHeight}
    >
      <Stack spacing={2}>
        {header ? <Box sx={{ mb: 0.5 }}>{header}</Box> : null}
        <LaunchTagline>{t('mweb.cityLaunch.tagline')}</LaunchTagline>
        <LaunchHeadline testId="city-launch-headline">{t('mweb.cityLaunch.headline', { vars: { city } })}</LaunchHeadline>
        <LaunchItemStrip items={LAUNCH_HERO_FEATURES} testId="city-launch-features" />
      </Stack>

      <CityLaunchCount city={city} count={status.subscriber_count} target={status.launch_target} />

      <Stack spacing={2}>
        {status.is_subscribed ? (
          <CityLaunchAdded
            citySlug={status.location.location_id}
            city={city}
            whatsappGroupUrl={status.location.whatsapp_group_url}
          />
        ) : (
          <CityLaunchNotify locationId={locationId} city={city} />
        )}
        <LaunchItemStrip items={LAUNCH_HERO_TRUST} testId="city-launch-trust" />
        <LaunchFooterLine testId="city-launch-footer">{t('mweb.cityLaunch.footer', { vars: { city } })}</LaunchFooterLine>
      </Stack>
    </LaunchSection>
  );
}
