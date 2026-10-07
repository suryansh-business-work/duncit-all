import { useRoute, type RouteProp } from '@react-navigation/native';
import { Spinner, Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { StackScreen } from '@/components/StackScreen';
import { ActionBlock } from '@/components/pod-request-detail/ActionBlock';
import { ContactBlock } from '@/components/pod-request-detail/ContactBlock';
import { CounterpartCard } from '@/components/pod-request-detail/CounterpartCard';
import { SlotSummary } from '@/components/pod-request-detail/SlotSummary';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { usePodRequestDetail } from '@/hooks/usePodRequestDetail';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * One Pod Request, for either side — where its notifications land
 * (/pod-requests/:id, mWeb's path). Who it is with, the note, the slot once one
 * is picked, the next move from the shared `podRequestNextAction`, and the
 * contact only once the pod exists. mWeb twin: pod-request-detail-page.
 */
export function PodRequestDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'PodRequestDetail'>>();
  const { request, pod, error, isLoading, actions } = usePodRequestDetail(route.params.id);

  return (
    <StackScreen title={t('podRequests.detailTitle')} testID="pod-request-detail-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          {isLoading && !request ? (
            <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
          ) : null}
          {!isLoading && !request ? (
            <Text role="alert" testID="pod-request-not-found" fontSize={14} color="$danger">
              {error ?? t('podRequests.notFound')}
            </Text>
          ) : null}
          {request ? (
            <>
              <CounterpartCard request={request} />
              {request.slot ? <SlotSummary slot={request.slot} /> : null}
              {actions.error ? (
                <Text
                  role="alert"
                  testID="pod-request-action-error"
                  fontSize={13}
                  color="$danger"
                  pressStyle={PRESS_STYLE.inline}
                  onPress={actions.clearError}
                >
                  {actions.error}
                </Text>
              ) : null}
              <ActionBlock request={request} actions={actions} />
              <ContactBlock request={request} pod={pod} />
            </>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
