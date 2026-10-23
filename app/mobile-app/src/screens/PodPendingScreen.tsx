import type { ReactNode } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Text } from 'tamagui';

import {
  ClubAdminCard,
  PendingBanner,
  PodPendingSummaryCard,
  RefreshAction,
  VenueOfferCard,
  VenuePendingCard,
} from '@/components/pod-pending';
import { StackScreen } from '@/components/StackScreen';
import { usePodPendingView } from '@/hooks/usePodPendingView';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { TipsLoader } from '@/components/TipsLoader';

/** Waiting screen a host lands on after creating a pod whose venue offer is
 * PENDING — banner + pod summary + the offer (the venue's counter to accept or
 * reject) + venue contact + club-admin help cards.
 *
 * The venue answers outside the app, so the screen carries both ways to ask
 * again: the back-bar's refresh button and a pull-down over the content. Once
 * the slot is approved the amber badge and banner turn green on the next load.
 * RN twin of mWeb's post-create pending page (rule 27). */
export function PodPendingScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PodPending'>>();
  const podId = route.params?.podId ?? '';
  const { view, isLoading, isRefreshing, error, refetch } = usePodPendingView(podId);
  const { currency } = usePublicFinance();
  const { t } = useTranslation();

  // The screen owns its own errors (they land in `error`), so a rejection here
  // would only be the request already reported on screen.
  const refresh = () => {
    refetch().catch(() => undefined);
  };

  let body: ReactNode;
  if (isLoading) {
    body = <TipsLoader testID="pod-pending-loading" />;
  } else if (error || !view) {
    body = (
      <Text role="alert" testID="pod-pending-error" padding={24} color="$danger">
        {toErrorMessage(error, t('mweb.podPending.loadFailed'))}
      </Text>
    );
  } else {
    body = (
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 20 }}
      >
        <PendingBanner status={view.pod.venue_approval_status} />
        <PodPendingSummaryCard view={view} />
        <VenueOfferCard podId={view.pod.id} currencySymbol={currency} onAnswered={refresh} />
        {view.venue ? (
          <VenuePendingCard venue={view.venue} status={view.pod.venue_approval_status} />
        ) : null}
        {view.club_admin ? <ClubAdminCard admin={view.club_admin} /> : null}
      </RefreshScrollView>
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
