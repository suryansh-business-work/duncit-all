import { useEffect, useState, type ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';

import { EarnBox } from '@/components/earn/EarnBox';
import { EarnMeetingActions } from '@/components/earn/EarnMeetingActions';
import { StackScreen } from '@/components/StackScreen';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useMe } from '@/hooks/useMe';
import { MyMeetingsDocument, type MyMeetingsResult } from '@/graphql/onboarding-survey';
import { graphqlRequest } from '@/services/graphql.client';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import {
  EARN_JOURNEYS,
  earnBoxState,
  partnerPortalUrl,
  type EarnJourney,
  type EarnJourneyCta,
  type EarnMeeting,
} from '@duncit/onboarding';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { useLoadingRegion } from '@/components/Skeleton/useLoadingRegion';

// Journeys, copy and the locked/unlocked rules are shared with mWeb and the
// partner portal so the three cannot drift (they already had — this screen's
// blocked-card copy used to omit the request id that mWeb showed).
const ICONS: Record<EarnJourney['iconKey'], ComponentProps<typeof MaterialIcons>['name']> = {
  host: 'dashboard',
  venue: 'store',
  ecomm: 'inventory-2',
  club: 'groups',
};

/** "Earn with Duncit" — three ways to start earning; a box is disabled when the
 * user already holds the matching role or has a pending onboarding meeting. */
export function EarnScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const loadingRegion = useLoadingRegion();
  const { data: meData, isLoading: meLoading } = useMe();
  const roles = meData?.me?.roles ?? [];
  const showProducts = useFeatureFlag('is_product_visible');
  // The product-seller path is hidden when products are gated off.
  const boxes = showProducts ? EARN_JOURNEYS : EARN_JOURNEYS.filter((box) => box.kind !== 'ECOMM');
  // null (not yet loaded) vs [] (loaded, no meetings) — the boxes' locked/
  // unlocked state depends on both roles and meetings, so a skeleton must
  // wait on both instead of rendering a box that flips a moment later.
  const [meetings, setMeetings] = useState<EarnMeeting[] | null>(null);

  const loadMeetings = () =>
    graphqlRequest<MyMeetingsResult>(MyMeetingsDocument, undefined, { auth: true })
      .then((res) => setMeetings(res.myMeetings))
      .catch(() => setMeetings((prev) => prev ?? []));

  useEffect(() => {
    fireAndForget(loadMeetings());
    // Reload whenever the screen regains focus (e.g. returning from the
    // onboarding gate after booking) so the cards lock/unlock immediately.
    const unsubscribe = navigation.addListener('focus', () => void loadMeetings());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Approved-user next step: an in-app route (host) or the Partner Portal
  // (venue/ecomm/club — opening the deep link there preserves it through login).
  const runCta = (cta: EarnJourneyCta) => {
    if (cta.target === 'internal') {
      navigation.navigate(cta.internalRoute as never);
      return;
    }
    fireAndForget(Linking.openURL(partnerPortalUrl(cta.partnerPath)));
  };

  // Roles default to [] and meetings starts null while either request is in
  // flight — rendering the cards against that placeholder state flashes the
  // wrong lock state a moment before the real one lands, so a skeleton covers
  // the gap instead (mirrors mWeb's `@duncit/earn` EarnJourneyList).
  const showSkeleton = meLoading || meetings === null;
  const loadedMeetings = meetings ?? [];

  return (
    <StackScreen title={t('mweb.earn.earnWithDuncit')} testID="earn-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={12} padding={16} paddingBottom={40} {...(showSkeleton ? loadingRegion : {})}>
          {showSkeleton
            ? boxes.map((box) => (
                <Skeleton
                  key={box.role}
                  testID={`earn-box-${box.role}-skeleton`}
                  height={104}
                  radius={16}
                />
              ))
            : boxes.map((box) => {
                const state = earnBoxState(box, roles, loadedMeetings);
                const { scheduledMeeting } = state;
                const cta = state.approved
                  ? { label: box.cta.label, onPress: () => runCta(box.cta) }
                  : undefined;
                return (
                  <YStack key={box.role} gap={8}>
                    <EarnBox
                      testID={`earn-box-${box.role}`}
                      title={box.title}
                      description={state.description}
                      icon={ICONS[box.iconKey]}
                      disabled={state.disabled}
                      disabledLabel={state.disabledLabel}
                      cta={cta}
                      onPress={() => navigation.navigate(box.nativeRoute as never)}
                    />
                    {scheduledMeeting ? (
                      <EarnMeetingActions
                        kind={box.kind}
                        rescheduleCount={scheduledMeeting.reschedule_count}
                        currentSlot={scheduledMeeting.scheduled_at ?? scheduledMeeting.requested_at}
                        onChanged={() => void loadMeetings()}
                      />
                    ) : null}
                  </YStack>
                );
              })}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
