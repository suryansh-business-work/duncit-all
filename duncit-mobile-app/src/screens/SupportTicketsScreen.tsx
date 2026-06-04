import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { TicketForm } from '@/components/support/TicketForm';
import { TicketRow } from '@/components/support/TicketRow';
import { useTickets } from '@/hooks/useSupport';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Support Tickets — the user's tickets with an inline create form. */
export function SupportTicketsScreen() {
  const { tickets, isLoading, reload } = useTickets();
  const [showForm, setShowForm] = useState(false);
  const { color: ink } = useThemeColors();

  return (
    <StackScreen
      title="Support Tickets"
      testID="support-tickets-screen"
      right={
        <XStack
          testID="ticket-toggle"
          role="button"
          aria-label="New ticket"
          onPress={() => setShowForm((s) => !s)}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name={showForm ? 'close' : 'add'} size={22} color={ink} />
        </XStack>
      }
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        {showForm ? (
          <TicketForm
            onCreated={() => {
              setShowForm(false);
              reload();
            }}
          />
        ) : null}
        {isLoading && tickets.length === 0 ? (
          <ListSkeleton testID="tickets-loading" count={3} />
        ) : tickets.length === 0 ? (
          <Text testID="tickets-empty" textAlign="center" color="$muted" paddingVertical={40}>
            No tickets yet. Tap + to raise one.
          </Text>
        ) : (
          tickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
        )}
      </ScrollView>
    </StackScreen>
  );
}
