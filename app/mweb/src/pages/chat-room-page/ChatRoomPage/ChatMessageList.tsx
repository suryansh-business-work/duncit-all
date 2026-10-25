import { Fragment, useMemo, useState, type ComponentProps, type ReactNode, type RefObject } from 'react';
import { Badge, Box, Chip, Fab, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChatHistoryTop from '../../../components/chat-history/ChatHistoryTop';
import { useScrollUpHistory } from '../../../components/chat-history/useScrollUpHistory';
import MomentLightbox from '../../../components/moments/MomentLightbox';
import ChatRoomNotice from '../ChatRoomNotice';
import MessageBubble from '../MessageBubble';
import { useChatFollow } from '../useChatFollow';
import { relativeDay, showDaySeparator } from '../../support-chat/chatHelpers';
import { useDateFormat } from '../../../utils/dateFormat';
import { useTranslation } from '../../../i18n/useTranslation';

type ChatMessage = ComponentProps<typeof MessageBubble>['message'];

interface ChatMessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Pod rooms open with their live/ended notice; club rooms have none. */
  podEnded: boolean | null;
  messages: ChatMessage[];
  myId: unknown;
  /** Absent in a thread without reactions or a message menu (a venue chat). */
  onOpenReact?: (el: HTMLElement, id: string) => void;
  onOpenActions?: (el: HTMLElement, id: string) => void;
  /** Scroll-up history: whether an older page may exist, and how to load it. */
  canLoadOlder: boolean;
  loadOlder: () => Promise<void>;
  /** A highlighted @mention was activated. */
  onOpenProfile: (userId: string) => void;
  /** The sentence an empty room shows; the group chat's when omitted. */
  emptyText?: string;
  /** Draws a line its own way (a venue chat's offer card); null keeps the bubble. */
  renderMessage?: (message: ChatMessage) => ReactNode;
}

/** Brings a loaded line into view and focuses it; an unloaded one is left alone. */
function jumpToMessage(scroller: HTMLElement | null, id: string) {
  const row = scroller?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`);
  if (!row) return;
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.querySelector<HTMLElement>('[role="button"]')?.focus({ preventScroll: true });
}

/**
 * The scrolling message log, split by day. It opens on the newest page; reading
 * up to the top loads the one before. The room's status notice opens it once
 * its first line is in.
 */
export default function ChatMessageList({
  scrollRef,
  podEnded,
  messages,
  myId,
  onOpenReact,
  onOpenActions,
  canLoadOlder,
  loadOlder,
  onOpenProfile,
  emptyText,
  renderMessage,
}: Readonly<ChatMessageListProps>) {
  const { t } = useTranslation();
  const { formatDate, timeZone } = useDateFormat();
  const follow = useChatFollow(scrollRef, messages, myId);
  const history = useScrollUpHistory({ scrollRef, oldestId: messages[0]?.id, canLoadOlder, loadOlder });
  // Every photo in the room, so the viewer swipes through them in order.
  const photos = useMemo(
    () => messages.filter((m: ChatMessage) => m.type === 'IMAGE' && !m.deleted && m.image_url),
    [messages],
  );
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  const dayText = (iso: string) => {
    const day = relativeDay(iso, timeZone);
    if (day === 'TODAY') return t('mweb.chatRoom.today');
    if (day === 'YESTERDAY') return t('mweb.chatRoom.yesterday');
    return formatDate(iso);
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <Box
        ref={scrollRef}
        data-testid="chat-room-messages"
        role="log"
        aria-busy={history.loadingOlder}
        onScroll={() => {
          follow.onScroll();
          history.onScrollNearTop();
        }}
        sx={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: { xs: 1.25, sm: 2 }, py: 1.25 }}
      >
        <ChatHistoryTop
          canLoadOlder={canLoadOlder}
          loadingOlder={history.loadingOlder}
          olderFailed={history.olderFailed}
          onShowOlder={history.showOlder}
        />
        {podEnded !== null && !canLoadOlder && <ChatRoomNotice ended={podEnded} />}
        {messages.length === 0 && (
          <Typography
            variant="body2"
            data-testid="chat-room-empty"
            sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
          >
            {emptyText ?? t('mweb.chat.noMessagesYet')}
          </Typography>
        )}
        {messages.map((m: ChatMessage, i: number) => (
          <Fragment key={m.id}>
            {showDaySeparator(m.createdAt, messages[i - 1]?.createdAt, timeZone) && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                <Typography
                  variant="caption"
                  data-testid={`chat-day-${m.id}`}
                  sx={{ bgcolor: 'action.hover', color: 'text.secondary', px: 1.25, py: 0.25, borderRadius: 999, fontWeight: 600 }}
                >
                  {dayText(m.createdAt)}
                </Typography>
              </Box>
            )}
            {renderMessage?.(m) ?? (
              <MessageBubble
                message={m}
                mine={String(m.user_id) === String(myId)}
                onOpenReact={onOpenReact}
                onOpenActions={onOpenActions}
                onOpenImage={(id) => setPhotoIndex(photos.findIndex((p: ChatMessage) => p.id === id))}
                onJumpTo={(id) => jumpToMessage(scrollRef.current, id)}
                onOpenProfile={onOpenProfile}
              />
            )}
          </Fragment>
        ))}
      </Box>
      {follow.unread > 0 && (
        <Chip
          color="primary"
          role="status"
          data-testid="chat-room-new-messages"
          label={t('mweb.chatRoom.newMessages', { count: follow.unread })}
          onClick={follow.jumpToLatest}
          sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontWeight: 600 }}
        />
      )}
      {!follow.atBottom && (
        <Fab
          size="small"
          color="primary"
          data-testid="chat-room-jump"
          aria-label={
            follow.unread > 0
              ? `${t('mweb.common.jumpToLatest')}, ${t('mweb.chatRoom.newMessages', { count: follow.unread })}`
              : t('mweb.common.jumpToLatest')
          }
          onClick={follow.jumpToLatest}
          sx={{ position: 'absolute', right: 16, bottom: 12 }}
        >
          <Badge badgeContent={follow.unread} color="secondary" max={99}>
            <KeyboardArrowDownIcon />
          </Badge>
        </Fab>
      )}
      <MomentLightbox
        moments={photos.map((p: ChatMessage) => ({ url: p.image_url }))}
        index={photoIndex}
        onClose={() => setPhotoIndex(null)}
        onIndexChange={setPhotoIndex}
      />
    </Box>
  );
}
