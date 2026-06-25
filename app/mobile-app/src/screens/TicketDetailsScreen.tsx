import { useState, type ReactNode } from 'react';
import { TextInput } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { TicketMeta } from '@/components/support/TicketMeta';
import { TicketReopenFooter } from '@/components/support/TicketReopenFooter';
import { ReopenReasonModal } from '@/components/support-chat/SupportChatModals';
import { useTicketDetails } from '@/hooks/useUnifiedTickets';
import { useThemeColors } from '@/hooks/useThemeColors';
import { canReopen } from '@/utils/support-chat';
import { formatDateTime } from '@/utils/date-format';
import { toErrorMessage } from '@/utils/errors';
import type { RootStackParamList } from '@/navigation/types';

/** One support ticket — subject, status and the full reply thread. Users land
 * here right after creating a ticket so they can track it immediately. */
export function TicketDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'TicketDetails'>>();
  const { ticket, isLoading, reply, reopen } = useTicketDetails(route.params.ticketId);
  const { muted, onPrimary, color: ink } = useThemeColors();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);
  const [reopenError, setReopenError] = useState('');
  // A resolved/closed ticket can be re-opened until the server's deadline (Bug 3/11).
  const resolved = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED';
  const reopenable = resolved && canReopen(ticket?.reopen_deadline);
  const reopenDeadlineLabel = ticket?.reopen_deadline ? formatDateTime(ticket.reopen_deadline) : '';

  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await reply(text);
      setText('');
    } catch (e) {
      setError(toErrorMessage(e, 'Could not send the reply.'));
    } finally {
      setBusy(false);
    }
  };

  const onReopenSubmit = async (reason: string) => {
    setReopenBusy(true);
    setReopenError('');
    try {
      await reopen(reason);
      setReopenOpen(false);
    } catch (e) {
      setReopenError(toErrorMessage(e, 'Could not re-open the ticket.'));
    } finally {
      setReopenBusy(false);
    }
  };

  let ticketBody: ReactNode;
  if (isLoading) {
    ticketBody = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" testID="ticket-details-loading" />
      </YStack>
    );
  } else if (!ticket) {
    ticketBody = (
      <Text testID="ticket-details-missing" textAlign="center" color="$muted" padding={24}>
        This ticket is unavailable.
      </Text>
    );
  } else {
    ticketBody = (
      <YStack flex={1}>
        <YStack padding={16} gap={6} borderBottomWidth={1} borderColor="$borderColor">
          <Text fontSize={16} fontWeight="900" color="$color">
            {ticket.subject}
          </Text>
          <TicketMeta
            id={ticket.id}
            status={ticket.status}
            category={ticket.category}
            priority={ticket.priority}
            createdAt={ticket.created_at}
            updatedAt={ticket.updated_at ?? ticket.last_message_at}
          />
        </YStack>
        <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {ticket.messages.map((m) => {
            const mine = m.author_role === 'USER';
            return (
              <XStack key={m.id} justifyContent={mine ? 'flex-end' : 'flex-start'}>
                <YStack
                  maxWidth="80%"
                  padding={10}
                  borderRadius={12}
                  backgroundColor={mine ? '$primary' : '$surface'}
                  borderWidth={mine ? 0 : 1}
                  borderColor="$borderColor"
                  gap={3}
                >
                  <Text fontSize={11} fontWeight="800" color={mine ? '$onPrimary' : '$muted'}>
                    {m.author_name}
                  </Text>
                  <Text fontSize={13.5} color={mine ? '$onPrimary' : '$color'}>
                    {m.body_text}
                  </Text>
                </YStack>
              </XStack>
            );
          })}
        </ScrollView>
        {error ? (
          <Text testID="ticket-reply-error" color="$danger" fontSize={12} paddingHorizontal={16}>
            {error}
          </Text>
        ) : null}
        <TicketReopenFooter
          reopenable={reopenable}
          expired={resolved && !reopenable}
          deadlineLabel={reopenDeadlineLabel}
          onReopen={() => {
            setReopenError('');
            setReopenOpen(true);
          }}
        />
        <XStack gap={8} padding={12} alignItems="center">
          <XStack
            flex={1}
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={22}
            paddingHorizontal={14}
            alignItems="center"
            minHeight={42}
          >
            <TextInput
              testID="ticket-reply-input"
              value={text}
              onChangeText={setText}
              placeholder="Write a reply…"
              placeholderTextColor={muted}
              style={{ flex: 1, color: ink, paddingVertical: 8 }}
              multiline
            />
          </XStack>
          <XStack
            testID="ticket-reply-send"
            role="button"
            aria-label="Send reply"
            onPress={() => void submit()}
            width={42}
            height={42}
            alignItems="center"
            justifyContent="center"
            borderRadius={21}
            backgroundColor="$primary"
            opacity={busy ? 0.6 : 1}
            pressStyle={{ opacity: 0.8 }}
          >
            <MaterialIcons name="send" size={18} color={onPrimary} />
          </XStack>
        </XStack>
      </YStack>
    );
  }

  return (
    <StackScreen title="Ticket Details" testID="ticket-details-screen">
      {ticketBody}
      <ReopenReasonModal
        open={reopenOpen}
        busy={reopenBusy}
        error={reopenError}
        deadlineLabel={reopenDeadlineLabel}
        onSubmit={(reason) => void onReopenSubmit(reason)}
        onClose={() => setReopenOpen(false)}
      />
    </StackScreen>
  );
}
