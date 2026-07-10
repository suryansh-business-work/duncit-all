import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fab, Stack } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChatHeader from '../ChatHeader';
import ChatComposer from '../ChatComposer';
import ChatMessageList from './ChatMessageList';
import ClosedNotice from './ClosedNotice';
import ChatDialogs from './ChatDialogs';
import { useSupportChat } from './useSupportChat';
import { useDateFormat } from '../../../utils/dateFormat';
import type { SupportChatMessage } from '../queries';

export default function SupportChatPage() {
  const navigate = useNavigate();
  const chat = useSupportChat();
  const { formatDateTime, formatTime, timeZone } = useDateFormat();

  const [showJump, setShowJump] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Default pinned so the thread opens at the latest message; onScroll unpins
  // once the user scrolls up, so the auto-follow effect stops fighting them.
  const pinnedRef = useRef(true);

  const { session, sessionId, messages, closed, reopenable, typingText } = chat;

  useEffect(() => {
    if (!pinnedRef.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, typingText]);

  // Auto-open the feedback dialog once a resolved chat has no rating yet (B8).
  useEffect(() => {
    if (closed && session?.rating == null) setFeedbackOpen(true);
  }, [closed, session?.rating]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = distance <= 80;
    setShowJump(distance > 160);
  };
  const jumpToBottom = () => {
    pinnedRef.current = true;
    setShowJump(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };
  // Sending always re-pins so the user's own message follows into view.
  const handleSend = (text: string, attachments: string[]) => {
    pinnedRef.current = true;
    chat.send(text, attachments);
  };

  const onConfirmResolve = () => {
    setConfirmOpen(false);
    chat.resolve();
  };
  const onReopen = async (reason: string) => {
    setReopenError(null);
    try {
      await chat.reopen(reason);
      setReopenOpen(false);
    } catch (e) {
      setReopenError(e instanceof Error ? e.message : 'Could not re-open this chat.');
    }
  };

  return (
    <Stack spacing={1.5} sx={{ height: 'calc(100dvh - 120px)', position: 'relative' }}>
      <ChatHeader
        ticketNo={session?.ticket_no ?? null}
        status={session?.status ?? null}
        reopenable={reopenable}
        onBack={() => navigate('/support')}
        onResolve={() => setConfirmOpen(true)}
        onReopen={() => setReopenOpen(true)}
        onDownload={chat.download}
        onEmail={() => setEmailOpen(true)}
      />

      <ChatMessageList
        loading={chat.loading}
        messages={messages}
        agentLastReadAt={session?.agent_last_read_at ?? null}
        timeZone={timeZone}
        typingText={typingText}
        formatTime={formatTime}
        onRetry={(m: SupportChatMessage) => chat.retry(m)}
        scrollRef={scrollRef}
        onScroll={onScroll}
      />

      {showJump && (
        <Fab size="small" color="primary" aria-label="Jump to latest" onClick={jumpToBottom} sx={{ position: 'absolute', right: 12, bottom: 76 }}>
          <KeyboardArrowDownIcon />
        </Fab>
      )}

      {closed ? (
        <ClosedNotice
          reopenable={reopenable}
          reopenDeadline={session?.reopen_deadline ?? null}
          formatDateTime={formatDateTime}
        />
      ) : (
        <ChatComposer disabled={chat.sending} onSend={handleSend} onTyping={chat.emitTyping} />
      )}

      {sessionId && (
        <ChatDialogs
          sessionId={sessionId}
          session={session}
          confirmOpen={confirmOpen}
          resolving={chat.resolving}
          onConfirmResolve={onConfirmResolve}
          onCancelResolve={() => setConfirmOpen(false)}
          feedbackOpen={feedbackOpen}
          onCloseFeedback={() => setFeedbackOpen(false)}
          onFeedbackSubmitted={chat.applyFeedback}
          emailOpen={emailOpen}
          onCloseEmail={() => setEmailOpen(false)}
          reopenOpen={reopenOpen}
          reopening={chat.reopening}
          reopenError={reopenError}
          onCloseReopen={() => {
            setReopenOpen(false);
            setReopenError(null);
          }}
          onReopen={onReopen}
        />
      )}
    </Stack>
  );
}
