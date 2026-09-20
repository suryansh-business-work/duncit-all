import type { ReactNode } from 'react';
import { YStack } from 'tamagui';
import { LAUNCH_HERO_FEATURES, LAUNCH_HERO_TRUST, launchSectionMedia } from '@duncit/utils';

import type { CityLaunchStatus } from '@/hooks/useCityLaunch';
import { useTranslation } from '@/hooks/useTranslation';

import { CityLaunchCount } from './CityLaunchCount';
import { LaunchFooterLine, LaunchHeadline, LaunchTagline } from './LaunchGlass';
import { LaunchItemStrip } from './LaunchItems';
import { LaunchSection } from './LaunchSection';

interface Props {
  status: CityLaunchStatus;
  city: string;
  minHeight: number;
  /** The button that adds your name, or what to do once it is added — the view decides which. */
  cta: ReactNode;
}

/**
 * The first screen: "{city}, are you in?" over the admin's video, the four
 * promises, the live count and the way to the launch goal, then the button
 * that adds your name (or what to do once it is added), the three
 * reassurances and the closing line. mWeb twin:
 * components/city-launch/CityLaunchHero.
 */
export function CityLaunchHero({ status, city, minHeight, cta }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <LaunchSection
      testID="city-launch-hero"
      media={launchSectionMedia(status.launch_media, 'hero')}
      minHeight={minHeight}
    >
      <YStack gap={16}>
        <LaunchTagline>{t('mweb.cityLaunch.tagline')}</LaunchTagline>
        <LaunchHeadline testID="city-launch-headline">
          {t('mweb.cityLaunch.headline', { vars: { city } })}
        </LaunchHeadline>
        <LaunchItemStrip items={LAUNCH_HERO_FEATURES} testID="city-launch-features" />
      </YStack>

      <CityLaunchCount city={city} count={status.subscriber_count} target={status.launch_target} />

      <YStack gap={16}>
        {cta}
        <LaunchItemStrip items={LAUNCH_HERO_TRUST} testID="city-launch-trust" />
        <LaunchFooterLine testID="city-launch-footer">
          {t('mweb.cityLaunch.footer', { vars: { city } })}
        </LaunchFooterLine>
      </YStack>
    </LaunchSection>
  );
}
