import type { ComponentProps, RefObject } from 'react';
import { Box } from '@mui/material';
import ChatRoomNotice from '../ChatRoomNotice';
import MessageBubble from '../MessageBubble';

type ChatMessage = ComponentProps<typeof MessageBubble>['message'];

interface ChatMessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  podEnded: boolean;
  messages: ChatMessage[];
  myId: unknown;
  onOpenReact: (el: HTMLElement, id: string) => void;
}

/** The scrolling message log, opened by the room's status notice. */
export default function ChatMessageList({ scrollRef, podEnded, messages, myId, onOpenReact }: Readonly<ChatMessageListProps>) {
  return (
    <Box
      ref={scrollRef}
      data-testid="chat-room-messages"
      role="log"
      sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.25, sm: 2 }, py: 1.25 }}
    >
      <ChatRoomNotice ended={podEnded} />
      {messages.map((m: ChatMessage) => (
        <MessageBubble
          key={m.id}
          message={m}
          mine={String(m.user_id) === String(myId)}
          onOpenReact={onOpenReact}
        />
      ))}
    </Box>
  );
}
