import { useEffect, useState, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from 'tamagui';

import { CheckoutSuccess } from '@/components/checkout';
import { StackScreen } from '@/components/StackScreen';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { TipsLoader } from '@/components/TipsLoader';
import { MobileCheckoutPodDocument } from '@/graphql/checkout';
import type { CheckoutPod } from '@/hooks/useCheckout';
import { usePodTicket } from '@/hooks/usePodHistory';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { logs } from '@duncit/logs';

/**
 * Where a FREE pod's instant join lands (mWeb's /pod/:podId/booked).
 *
 * The same confirmation a paid booking ends on — the pod and the ticket
 * download — with no receipt or invoice, because nothing was paid. Before
 * this, a free join stayed on Pod Details and the member had to find their
 * ticket in Pod History. The pod is read with the checkout's own query.
 */
export function FreeJoinSuccessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FreeJoinSuccess'>>();
  const podId = route.params?.podId ?? '';
  const { t } = useTranslation();
  const { download } = usePodTicket();
  const [pod, setPod] = useState<CheckoutPod>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileCheckoutPodDocument, { id: podId }, { auth: true })
      .then((data) => active && setPod(data.pod))
      .catch((err) => {
        logs.mobileApp.error('FreeJoinSuccessScreen', 'loadPod', { error: err, podId });
        if (active) setError(toErrorMessage(err));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [podId]);

  let body: ReactNode;
  if (loading) {
    body = <TipsLoader testID="free-join-success-loading" />;
  } else if (error || !pod) {
    body = (
      <Text role="alert" testID="free-join-success-error" padding={24} color="$danger">
        {error ?? t('mweb.podHistory.notFound')}
      </Text>
    );
  } else {
    body = (
      <RefreshScrollView contentContainerStyle={{ padding: 16 }}>
        <CheckoutSuccess
          payment={null}
          pod={pod}
          onDownloadTicket={() => download(podId)}
          onHome={() => navigation.navigate('Home')}
          onProfile={() => navigation.navigate('PodHistory')}
        />
      </RefreshScrollView>
    );
  }

  return (
    <StackScreen title={t('mweb.checkout.freeJoinTitle')} testID="free-join-success-screen">
      {body}
    </StackScreen>
  );
}
