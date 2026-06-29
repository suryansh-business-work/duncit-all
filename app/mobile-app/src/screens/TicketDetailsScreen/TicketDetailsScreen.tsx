import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { TicketMeta } from '@/components/support/TicketMeta';
import { TicketReopenFooter } from '@/components/support/TicketReopenFooter';
import { JumpToLatestButton } from '@/components/support-chat/JumpToLatestButton';
import {
  EmailTranscriptModal,
  ReopenReasonModal,
  ResolveConfirmModal,
  SupportFeedbackModal,
} from '@/components/support-chat/SupportChatModals';
import { useTicketDetails } from '@/hooks/useUnifiedTickets';
import { useAppSettings } from '@/hooks/useAppSettings';
import { TranscriptFormat } from '@/generated/graphql/graphql';
import { canReopen } from '@/utils/support-chat';
import { formatDateTime } from '@/utils/date-format';
import type { RootStackParamList } from '@/navigation/types';
import { TicketThread } from './TicketThread';
import { TicketHeaderActions } from './TicketHeaderActions';
import { TicketComposer } from './TicketComposer';
import { useTicketActions } from './useTicketActions';

/** One support ticket — subject, status and the full reply thread. Users land
 * here right after creating a ticket so they can track it immediately. */
export function TicketDetailsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'TicketDetails'>>();
  const details = useTicketDetails(route.params.ticketId);
  const { ticket, isLoading } = details;
  const a = useTicketActions(details);
  const { timeZone } = useAppSettings();
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<RNScrollView>(null);

  /* istanbul ignore next -- native autoscroll; method absent under the test renderer */
  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  const resolved = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED';
  const reopenable = resolved && canReopen(ticket?.reopen_deadline);
  const reopenDeadlineLabel = ticket?.reopen_deadline ? formatDateTime(ticket.reopen_deadline) : '';
  const canResolve = ticket?.status === 'OPEN' || ticket?.status === 'PENDING';

  // Auto-open feedback once resolved/closed and not yet rated (B8).
  const needsFeedback = !!resolved && ticket?.rating == null;
  const openFeedback = a.feedback.setOpen;
  useEffect(() => {
    if (needsFeedback) openFeedback(true);
  }, [needsFeedback, openFeedback]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;
    setShowJump(contentSize.height - layoutMeasurement.height - contentOffset.y > 160);
  };

  const openEmail = () => {
    a.email.setDone(false);
    a.email.setError('');
    a.email.setOpen(true);
  };

  const headerActions = (
    <TicketHeaderActions
      canResolve={!!canResolve}
      onResolve={() => a.confirm.setOpen(true)}
      onDownloadTxt={() => void a.download(TranscriptFormat.Txt)}
      onDownloadDocx={() => void a.download(TranscriptFormat.Docx)}
      onEmail={openEmail}
    />
  );

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
        <YStack flex={1}>
          <TicketThread
            ref={scrollRef}
            messages={ticket.messages}
            timeZone={timeZone}
            agentLastReadAt={ticket.agent_last_read_at}
            onScroll={onScroll}
          />
          {showJump ? (
            <JumpToLatestButton testID="ticket-jump-bottom" bottom={12} onPress={scrollToEnd} />
          ) : null}
        </YStack>
        {a.error ? (
          <Text testID="ticket-reply-error" color="$danger" fontSize={12} paddingHorizontal={16}>
            {a.error}
          </Text>
        ) : null}
        <TicketReopenFooter
          reopenable={!!reopenable}
          expired={!!resolved && !reopenable}
          deadlineLabel={reopenDeadlineLabel}
          onReopen={() => {
            a.reopen.setError('');
            a.reopen.setOpen(true);
          }}
        />
        <TicketComposer locked={!!resolved} busy={a.busy} onSend={a.submitReply} />
      </YStack>
    );
  }

  return (
    <StackScreen
      title="Ticket Details"
      testID="ticket-details-screen"
      right={ticket ? headerActions : undefined}
    >
      {ticketBody}
      <ResolveConfirmModal
        open={a.confirm.open}
        busy={a.confirm.busy}
        onConfirm={() => void a.confirm.run()}
        onCancel={() => a.confirm.setOpen(false)}
      />
      <SupportFeedbackModal
        open={a.feedback.open}
        busy={a.feedback.busy}
        done={a.feedback.done}
        error={a.feedback.error}
        rating={ticket?.rating}
        feedbackComment={ticket?.feedback_comment}
        onSubmit={(r, c) => void a.feedback.submit(r, c)}
        onClose={() => a.feedback.setOpen(false)}
      />
      <EmailTranscriptModal
        open={a.email.open}
        busy={a.email.busy}
        done={a.email.done}
        error={a.email.error}
        onSend={(em) => void a.email.send(em)}
        onClose={() => a.email.setOpen(false)}
      />
      <ReopenReasonModal
        open={a.reopen.open}
        busy={a.reopen.busy}
        error={a.reopen.error}
        deadlineLabel={reopenDeadlineLabel}
        onSubmit={(reason) => void a.reopen.submit(reason)}
        onClose={() => a.reopen.setOpen(false)}
      />
    </StackScreen>
  );
}
