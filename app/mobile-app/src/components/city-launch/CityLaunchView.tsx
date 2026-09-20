import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';
import { LAUNCH_ROLE_SECTIONS } from '@duncit/utils';

import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';
import { useCityLaunch, type CityLaunchStatus } from '@/hooks/useCityLaunch';
import { useLogout } from '@/hooks/useLogout';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

import { CityLaunchAdded } from './CityLaunchAdded';
import { CityLaunchHero } from './CityLaunchHero';
import { CityLaunchNotify } from './CityLaunchNotify';
import { CityLaunchRoleSection } from './CityLaunchRoleSection';

type Launch = ReturnType<typeof useCityLaunch>;

interface Props {
  /** The city's slug from a shared link, or its `Location.id` (Home, older links)
   * — the server resolves either. */
  locationId: string;
  /** The strip the floating nav covers on a tab, or a stack's inset — kept
   * under the last screen, and taken off every screen's height so each fits
   * above it. */
  bottomSpace: number;
}

/** The button that adds your name, or what to do once it is added. */
function CityLaunchCta({ status, launch }: Readonly<{ status: CityLaunchStatus; launch: Launch }>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const logout = useLogout();
  const { location } = status;
  const city = location.location_name;

  if (status.is_subscribed) {
    return (
      <CityLaunchAdded
        citySlug={location.location_id}
        city={city}
        whatsappGroupUrl={location.whatsapp_group_url}
      />
    );
  }
  return (
    <CityLaunchNotify
      city={city}
      subscribing={launch.subscribing}
      problem={launch.problem}
      onSubscribe={launch.subscribe}
      // The account details, where the WhatsApp number is edited (mWeb's /account).
      onGoToProfile={() => navigation.navigate('Account')}
      // The server stopped accepting this session: signing out lands on
      // Login, and the saved city brings the member straight back here.
      onSignIn={() => fireAndForget(logout())}
    />
  );
}

/**
 * The waitlist a city that has not launched yet shows in place of the feed:
 * four full-height screens, each over its admin-set video — the live count
 * and the way to the launch goal with the button that adds your name, then
 * one screen each for hosting, a venue and running a club. mWeb twin:
 * components/city-launch/CityLaunchView (rule 27).
 */
export function CityLaunchView({ locationId, bottomSpace }: Readonly<Props>) {
  const { t } = useTranslation();
  const loadingRegion = useLoadingRegion();
  const launch = useCityLaunch(locationId);
  const { status } = launch;
  // One screen is the scroll view's own height less the strip under it —
  // measured, the way mWeb measures its scroller.
  const [viewportHeight, setViewportHeight] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setViewportHeight(event.nativeEvent.layout.height);
  const minHeight = Math.max(0, viewportHeight - bottomSpace);

  let body;
  if (status) {
    const city = status.location.location_name;
    body = (
      <>
        <CityLaunchHero
          status={status}
          city={city}
          minHeight={minHeight}
          cta={<CityLaunchCta status={status} launch={launch} />}
        />
        {LAUNCH_ROLE_SECTIONS.map((role) => (
          <CityLaunchRoleSection
            key={role.section}
            role={role}
            media={status.launch_media}
            minHeight={minHeight}
          />
        ))}
      </>
    );
  } else if (launch.isLoading) {
    body = (
      <YStack alignItems="center" paddingVertical={48}>
        <Spinner {...loadingRegion} testID="city-launch-loading" color="$primary" />
      </YStack>
    );
  } else if (launch.loadError) {
    body = (
      <Text testID="city-launch-error" role="alert" padding={16} fontSize={14} color="$danger">
        {launch.loadError}
      </Text>
    );
  } else {
    body = (
      <Text
        testID="city-launch-not-found"
        paddingVertical={48}
        fontSize={15}
        color="$muted"
        textAlign="center"
      >
        {t('mweb.cityLaunch.notFound')}
      </Text>
    );
  }

  return (
    <RefreshScrollView flex={1} showsVerticalScrollIndicator={false} onLayout={onLayout}>
      <YStack testID="city-launch-view" paddingBottom={bottomSpace}>
        {body}
      </YStack>
    </RefreshScrollView>
  );
}
