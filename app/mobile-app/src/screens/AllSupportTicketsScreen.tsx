import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useUnifiedTickets, type UnifiedTicket } from '@/hooks/useUnifiedTickets';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

const SOURCE_LABEL: Record<string, string> = {
  TICKET: 'Support Ticket',
  SOS: 'SOS',
  CALLBACK: 'Callback Request',
  CHAT: 'Chat with Us',
};

/** A small soft pill — the source and status labels on a row. */
function SoftPill({ label }: Readonly<{ label: string }>) {
  return (
    <XStack borderRadius={999} paddingHorizontal={10} paddingVertical={3} backgroundColor="$soft">
      <Text fontSize={11} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

interface TicketLineProps {
  row: UnifiedTicket;
  isFirst: boolean;
  onOpen: (row: UnifiedTicket) => void;
}

/** One unified request row — number + source pill, title, status pill. */
function TicketLine({ row, isFirst, onOpen }: Readonly<TicketLineProps>) {
  return (
    <XStack
      testID={`all-ticket-${row.ticket_no}`}
      role="button"
      aria-label={row.title}
      onPress={() => onOpen(row)}
      gap={12}
      paddingHorizontal={16}
      paddingVertical={14}
      borderTopWidth={isFirst ? 0 : 1}
      borderTopColor="$borderColor"
      alignItems="center"
      pressStyle={PRESS_STYLE.row}
    >
      <YStack flex={1} gap={4}>
        <XStack gap={8} alignItems="center">
          <Text fontSize={12} fontWeight="600" color="$muted">
            {row.ticket_no}
          </Text>
          <SoftPill label={SOURCE_LABEL[row.source] ?? row.source} />
        </XStack>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {row.title}
        </Text>
      </YStack>
      <SoftPill label={row.status} />
    </XStack>
  );
}

/** One list of every support request the user has raised — across SOS,
 * callbacks, support tickets and chat, with prefixed ticket numbers. */
export function AllSupportTicketsScreen() {
  const { t } = useTranslation();
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
        {t('mweb.supportHub.youHaveNotRaisedAnySupport')}
      </Text>
    );
  } else {
    body = (
      <SurfaceCard padding={0} overflow="hidden">
        {rows.map((row, index) => (
          <TicketLine
            key={`${row.source}-${row.id}`}
            row={row}
            isFirst={index === 0}
            onOpen={open}
          />
        ))}
      </SurfaceCard>
    );
  }

  return (
    <StackScreen title={t('mweb.common.allSupportTickets')} testID="all-support-tickets-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {body}
      </RefreshScrollView>
    </StackScreen>
  );
}
