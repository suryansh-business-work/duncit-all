import type { ReactNode } from 'react';
import { YStack } from 'tamagui';
import type { VenueChatReadMark } from '@duncit/utils';

import { ChatLineMeta } from '@/components/chat/ChatLineMeta';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenueChatMessage } from '@/hooks/useVenueChat';
import type { OfferCardDecor } from './useOfferCards';
import { VenueChatSeenFaces } from './VenueChatSeenFaces';

interface Props {
  line: VenueChatMessage;
  meId: string | null | undefined;
  /** The other members whose faces sit under this line (`seenFacesByLine`). */
  faces: readonly VenueChatReadMark[] | undefined;
  /** Draws an OFFER line as its card (`useOfferCards`); null keeps the bubble. */
  renderCard: (line: VenueChatMessage, decor: OfferCardDecor) => ReactNode;
  /** Long press: the line's actions — react, and edit or delete one's own. */
  onOpenActions: (line: VenueChatMessage) => void;
  /** A reaction chip was tapped: add the reader's reaction with it, or take it back. */
  onToggleReaction: (lineId: string, emoji: string) => void;
  onOpenProfile: (userId: string) => void;
}

/**
 * One line of a venue thread, drawn the same way whatever it is: a bubble, or
 * an offer move's card, each with its reactions (a chip per emoji, the
 * reader's own picked, each a toggle), when it was sent (the admin's date and
 * time format) and whether it was edited — and under it the faces of whoever
 * has read the thread this far.
 */
export function VenueChatLineItem({
  line,
  meId,
  faces,
  renderCard,
  onOpenActions,
  onToggleReaction,
  onOpenProfile,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const time = formatDateTime(line.createdAt);
  const edited = !!line.edited_at && !line.deleted;
  const openActions = line.deleted ? undefined : () => onOpenActions(line);
  const toggle = (emoji: string) => onToggleReaction(line.id, emoji);
  const card = line.offer
    ? renderCard(line, {
        footer: (
          <ChatLineMeta
            messageId={line.id}
            reactions={line.reactions}
            time={t('availability.offers.chat.sentAt', { vars: { time } })}
            edited={edited}
            ink="$color"
            metaInk="$muted"
            viewerId={meId}
            onToggleReaction={toggle}
          />
        ),
        onLongPress: openActions,
      })
    : null;

  return (
    <YStack gap={4}>
      {card ?? (
        <ChatMessageBubble
          message={line}
          mine={line.user_id === meId}
          onReact={openActions}
          onOpenProfile={onOpenProfile}
          timeLabel={time}
          edited={edited}
          viewerId={meId}
          onToggleReaction={toggle}
        />
      )}
      <VenueChatSeenFaces lineId={line.id} faces={faces} />
    </YStack>
  );
}
