import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

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
import { CityLaunchWhatElse } from './CityLaunchWhatElse';

type Launch = ReturnType<typeof useCityLaunch>;

interface Props {
  /** The Location's id (GraphQL `Location.id`). */
  locationId: string;
  /** Room kept under the last card — the tab's floating nav, or a stack's inset. */
  bottomSpace: number;
}

/** The loaded page: hero, the ask (or what to do once added) and the Earn cards. */
function CityLaunchBody({
  locationId,
  status,
  launch,
}: Readonly<{ locationId: string; status: CityLaunchStatus; launch: Launch }>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const logout = useLogout();
  const { location } = status;
  const city = location.location_name;

  return (
    <>
      <CityLaunchHero
        city={city}
        image={location.location_image}
        count={status.subscriber_count}
        target={status.launch_target}
      />
      {status.is_subscribed ? (
        <CityLaunchAdded
          locationId={locationId}
          city={city}
          whatsappGroupUrl={location.whatsapp_group_url}
        />
      ) : (
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
      )}
      <CityLaunchWhatElse />
    </>
  );
}

/**
 * The waitlist a city that has not launched yet shows in place of the feed:
 * the live count and the way to the launch goal, then either the button that
 * adds your name or what to do once it is added, then the other ways to help.
 * mWeb twin: components/city-launch/CityLaunchView (rule 27).
 */
export function CityLaunchView({ locationId, bottomSpace }: Readonly<Props>) {
  const { t } = useTranslation();
  const loadingRegion = useLoadingRegion();
  const launch = useCityLaunch(locationId);
  const { status } = launch;

  let body;
  if (status) {
    body = <CityLaunchBody locationId={locationId} status={status} launch={launch} />;
  } else if (launch.isLoading) {
    body = (
      <YStack alignItems="center" paddingVertical={48}>
        <Spinner {...loadingRegion} testID="city-launch-loading" color="$primary" />
      </YStack>
    );
  } else if (launch.loadError) {
    body = (
      <Text testID="city-launch-error" role="alert" fontSize={14} color="$danger">
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
    <RefreshScrollView flex={1} showsVerticalScrollIndicator={false}>
      <YStack testID="city-launch-view" gap={24} padding={16} paddingBottom={bottomSpace}>
        {body}
      </YStack>
    </RefreshScrollView>
  );
}
