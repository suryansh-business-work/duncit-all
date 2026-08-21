import type { ReactNode } from 'react';
import { RefreshControl } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import {
  ClubAdminCard,
  PendingBanner,
  PodPendingSummaryCard,
  RefreshAction,
  VenuePendingCard,
} from '@/components/pod-pending';
import { StackScreen } from '@/components/StackScreen';
import { usePodPendingView } from '@/hooks/usePodPendingView';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** Waiting screen a host lands on after creating a pod whose venue slot request
 * is PENDING — banner + pod summary + venue contact + club-admin help cards.
 *
 * The venue answers outside the app, so the screen carries both ways to ask
 * again: the back-bar's refresh button and a pull-down over the content. Once
 * the slot is approved the amber badge and banner turn green on the next load.
 * RN twin of mWeb's post-create pending page (rule 27). */
export function PodPendingScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PodPending'>>();
  const podId = route.params?.podId ?? '';
  const { view, isLoading, isRefreshing, error, refetch } = usePodPendingView(podId);
  const { t } = useTranslation();
  const { primary, surface } = useThemeColors();

  // The screen owns its own errors (they land in `error`), so a rejection here
  // would only be the request already reported on screen.
  const refresh = () => {
    refetch().catch(() => undefined);
  };

  let body: ReactNode;
  if (isLoading) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="pod-pending-loading" color="$primary" />
      </YStack>
    );
  } else if (error || !view) {
    body = (
      <Text testID="pod-pending-error" padding={24} color="$danger">
        {toErrorMessage(error, t('mweb.podPending.loadFailed'))}
      </Text>
    );
  } else {
    body = (
      <ScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={primary}
            colors={[primary]}
            progressBackgroundColor={surface}
          />
        }
      >
        <PendingBanner status={view.pod.venue_approval_status} />
        <PodPendingSummaryCard view={view} />
        {view.venue ? (
          <VenuePendingCard venue={view.venue} status={view.pod.venue_approval_status} />
        ) : null}
        {view.club_admin ? <ClubAdminCard admin={view.club_admin} /> : null}
      </ScrollView>
    );
  }

  return (
    <StackScreen
      title={t('mweb.podPending.title')}
      testID="pod-pending-screen"
      right={<RefreshAction refreshing={isRefreshing} onPress={refresh} />}
    >
      {body}
    </StackScreen>
  );
}
