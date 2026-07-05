import { useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { BackoutConfirmDialog, PodHistoryDetails } from '@/components/pod-history';
import { StackScreen } from '@/components/StackScreen';
import { usePodBackout, usePodHistory, usePodInvoice, usePodTicket } from '@/hooks/usePodHistory';
import { useProductOrders } from '@/hooks/useProductOrders';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';
import { refundLabel } from '@/utils/pod-history';

const GENERAL_TERMS_URL = 'https://duncit.com/terms';

/** Pod History details — status, actions (pod details, backout, refund, invoice,
 * support), terms links and timeline. RN twin of mWeb's PodHistoryDetailsPage. */
export function PodHistoryDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PodHistoryDetails'>>();
  const membershipId = route.params?.membershipId ?? '';
  const { items, isLoading, error, refetch } = usePodHistory();
  const { backout, busy: backingOut } = usePodBackout();
  const { download, busy: invoiceBusy } = usePodInvoice();
  const { download: downloadTicketPdf, busy: ticketBusy } = usePodTicket();
  const [backoutOpen, setBackoutOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = items.find((item) => item.id === membershipId) ?? null;
  const title = selected?.pod?.pod_title ?? 'Details';
  const { orders: productOrders, isLoading: ordersLoading } = useProductOrders(selected?.pod?.id);

  const confirmBackout = async () => {
    if (!selected?.pod?.id) return;
    try {
      await backout(selected.pod.id);
      setNotice('Backout request recorded');
      setBackoutOpen(false);
      await refetch();
    } catch (backoutError) {
      setNotice(toErrorMessage(backoutError));
    }
  };

  const downloadInvoice = async () => {
    /* istanbul ignore next -- the invoice button is disabled without a payment id */
    if (!selected?.payment_id) return;
    try {
      await download(selected.payment_id);
    } catch (invoiceError) {
      setNotice(toErrorMessage(invoiceError));
    }
  };

  const downloadTicket = async () => {
    /* istanbul ignore next -- the ticket button is disabled without a pod id */
    if (!selected?.pod?.id) return;
    try {
      await downloadTicketPdf(selected.pod.id);
    } catch (ticketError) {
      setNotice(toErrorMessage(ticketError));
    }
  };

  return (
    <StackScreen title={title} testID="pod-history-details-screen">
      {isLoading && items.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="pod-history-details-loading" color="$primary" />
        </YStack>
      ) : error ? (
        <Text testID="pod-history-details-error" padding={24} color="$danger">
          {toErrorMessage(error)}
        </Text>
      ) : !selected ? (
        <Text testID="pod-history-details-missing" padding={24} color="$muted">
          Pod history record not found.
        </Text>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <PodHistoryDetails
            item={selected}
            backingOut={backingOut}
            invoiceBusy={invoiceBusy}
            ticketBusy={ticketBusy}
            notice={notice}
            productOrders={productOrders}
            ordersLoading={ordersLoading}
            onPodDetails={() =>
              selected.pod?.id &&
              navigation.navigate('PodDetails', {
                podId: selected.pod.id,
                title: selected.pod.pod_title,
              })
            }
            onBackout={() => setBackoutOpen(true)}
            onRefundStatus={() =>
              setNotice(`Refund status: ${refundLabel(selected.refund_status)}`)
            }
            onInvoice={downloadInvoice}
            onTicket={downloadTicket}
            onSupport={() => navigation.navigate('SupportTickets')}
            onBackoutTerms={() => navigation.navigate('Policy', { slug: 'backout-terms' })}
            onGeneralTerms={() => void Linking.openURL(GENERAL_TERMS_URL)}
          />
        </ScrollView>
      )}

      <BackoutConfirmDialog
        open={backoutOpen}
        busy={backingOut}
        onClose={() => setBackoutOpen(false)}
        onConfirm={confirmBackout}
        onViewTerms={() => {
          setBackoutOpen(false);
          navigation.navigate('Policy', { slug: 'backout-terms' });
        }}
      />
    </StackScreen>
  );
}
