import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { TicketRow } from '@/components/support/TicketRow';
import { useTickets } from '@/hooks/useSupport';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Chat with Us — an inbox of the user's support threads (mWeb parity): a "chat
 * live with an agent" shortcut to the real-time chat, plus every ticket the user
 * has raised with its status. The live chat itself is the LiveChat screen.
 */
export function ChatWithUsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tickets, isLoading } = useTickets();
  const { onPrimary, color: ink } = useThemeColors();

  let body: React.ReactNode;
  if (isLoading && tickets.length === 0) {
    body = <ListSkeleton testID="chat-inbox-loading" count={3} />;
  } else if (tickets.length === 0) {
    body = (
      <Text testID="chat-inbox-empty" textAlign="center" color="$muted" paddingVertical={40}>
        You haven’t raised any tickets yet.
      </Text>
    );
  } else {
    body = tickets.map((ticket) => (
      <YStack
        key={ticket.id}
        testID={`chat-inbox-ticket-${ticket.id}`}
        role="button"
        aria-label={ticket.subject}
        onPress={() => navigation.navigate('TicketDetails', { ticketId: ticket.id })}
        pressStyle={{ opacity: 0.85 }}
      >
        <TicketRow ticket={ticket} />
      </YStack>
    ));
  }

  return (
    <StackScreen
      title="Chat with Us"
      testID="chat-with-us-screen"
      right={
        <XStack
          testID="chat-inbox-new"
          role="button"
          aria-label="New ticket"
          onPress={() => navigation.navigate('SupportTickets')}
          alignItems="center"
          gap={4}
          paddingHorizontal={12}
          height={36}
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="add" size={16} color={onPrimary} />
          <Text fontSize={13} fontWeight="900" color="$onPrimary">
            New
          </Text>
        </XStack>
      }
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Text testID="chat-inbox-subtitle" fontSize={13} color="$muted">
          Real-time chat with our support team
        </Text>
        <XStack
          testID="chat-live-card"
          role="button"
          aria-label="Chat live with an agent"
          onPress={() => navigation.navigate('LiveChat')}
          alignItems="center"
          gap={12}
          padding={14}
          borderRadius={16}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          pressStyle={{ opacity: 0.85 }}
        >
          <YStack
            width={44}
            height={44}
            borderRadius={14}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name="forum" size={22} color={onPrimary} />
          </YStack>
          <YStack flex={1} gap={2}>
            <Text fontSize={15} fontWeight="900" color="$color">
              Chat live with an agent
            </Text>
            <Text fontSize={12.5} color="$muted">
              Get real-time answers without raising a ticket.
            </Text>
          </YStack>
          <MaterialIcons name="chevron-right" size={22} color={ink} />
        </XStack>

        {body}
      </ScrollView>
    </StackScreen>
  );
}
