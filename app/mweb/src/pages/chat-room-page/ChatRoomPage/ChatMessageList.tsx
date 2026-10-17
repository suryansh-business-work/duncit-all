import { useMemo, useState, type ComponentProps, type RefObject } from 'react';
import { Box, Typography } from '@mui/material';
import MomentLightbox from '../../../components/moments/MomentLightbox';
import ChatRoomNotice from '../ChatRoomNotice';
import MessageBubble from '../MessageBubble';
import { useTranslation } from '../../../i18n/useTranslation';

type ChatMessage = ComponentProps<typeof MessageBubble>['message'];

interface ChatMessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Pod rooms open with their live/ended notice; club rooms have none. */
  podEnded: boolean | null;
  messages: ChatMessage[];
  myId: unknown;
  onOpenReact: (el: HTMLElement, id: string) => void;
  onOpenActions: (el: HTMLElement, id: string) => void;
}

/** The scrolling message log, opened by the room's status notice. */
export default function ChatMessageList({
  scrollRef,
  podEnded,
  messages,
  myId,
  onOpenReact,
  onOpenActions,
}: Readonly<ChatMessageListProps>) {
  const { t } = useTranslation();
  // Every photo in the room, so the viewer swipes through them in order.
  const photos = useMemo(
    () => messages.filter((m: ChatMessage) => m.type === 'IMAGE' && !m.deleted && m.image_url),
    [messages],
  );
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  return (
    <Box
      ref={scrollRef}
      data-testid="chat-room-messages"
      role="log"
      sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.25, sm: 2 }, py: 1.25 }}
    >
      {podEnded !== null && <ChatRoomNotice ended={podEnded} />}
      {messages.length === 0 && (
        <Typography
          variant="body2"
          data-testid="chat-room-empty"
          sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
        >
          {t('mweb.chat.noMessagesYet')}
        </Typography>
      )}
      {messages.map((m: ChatMessage) => (
        <MessageBubble
          key={m.id}
          message={m}
          mine={String(m.user_id) === String(myId)}
          onOpenReact={onOpenReact}
          onOpenActions={onOpenActions}
          onOpenImage={(id) => setPhotoIndex(photos.findIndex((p: ChatMessage) => p.id === id))}
        />
      ))}
      <MomentLightbox
        moments={photos.map((p: ChatMessage) => ({ url: p.image_url }))}
        index={photoIndex}
        onClose={() => setPhotoIndex(null)}
        onIndexChange={setPhotoIndex}
      />
    </Box>
  );
}
