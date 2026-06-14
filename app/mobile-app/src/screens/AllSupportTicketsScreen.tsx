import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { useUnifiedTickets, type UnifiedTicket } from '@/hooks/useUnifiedTickets';
import type { RootStackParamList } from '@/navigation/types';

const SOURCE_LABEL: Record<string, string> = {
  TICKET: 'Support Ticket',
  SOS: 'SOS',
  CALLBACK: 'Callback Request',
  CHAT: 'Chat with Us',
};

const SOURCE_TINT: Record<string, string> = {
  TICKET: 'rgba(255,79,115,0.16)',
  SOS: 'rgba(244,67,54,0.16)',
  CALLBACK: 'rgba(33,150,243,0.16)',
  CHAT: 'rgba(76,175,80,0.16)',
};

/** One list of every support request the user has raised — across SOS,
 * callbacks, support tickets and chat, with prefixed ticket numbers. */
export function AllSupportTicketsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rows, isLoading, error } = useUnifiedTickets();

  const open = (row: UnifiedTicket) => {
    if (row.source === 'TICKET') navigation.navigate('TicketDetails', { ticketId: row.id });
    else if (row.source === 'CHAT') navigation.navigate('LiveChat');
  };

  let body: React.ReactNode;
  if (isLoading && rows.length === 0) {
    body = <ListSkeleton testID="all-tickets-loading" count={4} />;
  } else if (error) {
    body = (
      <Text testID="all-tickets-error" textAlign="center" color="$muted" paddingVertical={40}>
        {error}
      </Text>
    );
  } else if (rows.length === 0) {
    body = (
      <Text testID="all-tickets-empty" textAlign="center" color="$muted" paddingVertical={40}>
        You have not raised any support requests yet.
      </Text>
    );
  } else {
    body = rows.map((row) => (
      <XStack
        key={`${row.source}-${row.id}`}
        testID={`all-ticket-${row.ticket_no}`}
        role="button"
        aria-label={row.title}
        onPress={() => open(row)}
        gap={10}
        padding={12}
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        alignItems="center"
        pressStyle={{ opacity: 0.85 }}
      >
        <YStack flex={1} gap={2}>
          <XStack gap={8} alignItems="center">
            <Text fontSize={11} fontWeight="900" color="$muted">
              {row.ticket_no}
            </Text>
            <XStack
              borderRadius={999}
              paddingHorizontal={8}
              paddingVertical={2}
              backgroundColor={SOURCE_TINT[row.source] ?? '$background'}
            >
              <Text fontSize={10.5} fontWeight="800" color="$color">
                {SOURCE_LABEL[row.source] ?? row.source}
              </Text>
            </XStack>
          </XStack>
          <Text fontSize={14} fontWeight="800" color="$color" numberOfLines={1}>
            {row.title}
          </Text>
        </YStack>
        <Text fontSize={11.5} fontWeight="800" color="$muted">
          {row.status}
        </Text>
      </XStack>
    ));
  }

  return (
    <StackScreen title="All Support Tickets" testID="all-support-tickets-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}>
        {body}
      </ScrollView>
    </StackScreen>
  );
}
