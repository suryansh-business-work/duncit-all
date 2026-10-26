import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { reactionGroups, type ReactionGroup } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

/** Foreground text colour of the line it sits under — tinted for the reader's own bubble. */
export type LineInk = '$onPrimary' | '$color' | '$muted';

interface Props {
  messageId: string;
  /** One row per member per emoji (`PodMessage.reactions`). */
  reactions?: readonly { user_id: string; emoji: string }[] | null;
  /** When it was sent, already written out; nothing shows without it. */
  time: string;
  /** Its author changed it after sending. */
  edited?: boolean;
  ink: LineInk;
  /** The time's colour — solid on a tinted bubble, where a faded one fails 4.5:1. */
  metaInk: LineInk;
  /** The reader: their own reaction is drawn picked. */
  viewerId?: string | null;
  /** Tapping a chip adds the reader's reaction with that emoji, or takes it back. Absent: chips only show. */
  onToggleReaction?: (emoji: string) => void;
}

/** One emoji's chip: how many reacted with it, picked when the reader is one of them. */
function ReactionChip({
  group,
  messageId,
  ink,
  onToggle,
}: Readonly<{
  group: ReactionGroup;
  messageId: string;
  ink: LineInk;
  onToggle?: (emoji: string) => void;
}>) {
  const { t } = useTranslation();
  const count = t('availability.offers.chat.reactionCount', {
    vars: { emoji: group.emoji, count: group.count },
  });
  if (!onToggle) {
    return (
      <Text testID={`reaction-${messageId}-${group.emoji}`} fontSize={12} color={ink}>
        {count}
      </Text>
    );
  }
  const toggle = t('availability.offers.chat.reactWith', { vars: { emoji: group.emoji } });
  // A chip of its own on any bubble, so it reads the same on the reader's tinted side.
  return (
    <XStack
      testID={`reaction-${messageId}-${group.emoji}`}
      role="button"
      tabIndex={0}
      hitSlop={6}
      aria-label={`${count}, ${toggle}`}
      aria-selected={group.mine}
      onPress={() => onToggle(group.emoji)}
      pressStyle={PRESS_STYLE.inline}
      alignItems="center"
      paddingHorizontal={8}
      paddingVertical={2}
      borderRadius={999}
      borderWidth={1}
      borderColor={group.mine ? '$primary' : '$borderColor'}
      backgroundColor={group.mine ? '$soft' : '$surface'}
    >
      <Text fontSize={12} fontWeight={group.mine ? '700' : '400'} color="$color">
        {count}
      </Text>
    </XStack>
  );
}

/**
 * What sits at the foot of every chat line, bubble or offer card alike: its
 * reactions as one chip per emoji (the reader's own picked, each a toggle where
 * the chat allows it), then when it was sent and whether it was edited.
 */
export function ChatLineMeta({
  messageId,
  reactions,
  time,
  edited = false,
  ink,
  metaInk,
  viewerId,
  onToggleReaction,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const groups = reactionGroups(reactions, viewerId);
  const stamp = [time, edited ? t('mweb.chatRoom.edited') : ''].filter(Boolean).join(' · ');

  return (
    <YStack gap={4}>
      {groups.length > 0 ? (
        <XStack gap={6} flexWrap="wrap">
          {groups.map((group) => (
            <ReactionChip
              key={group.emoji}
              group={group}
              messageId={messageId}
              ink={ink}
              onToggle={onToggleReaction}
            />
          ))}
        </XStack>
      ) : null}
      {stamp ? (
        <Text
          testID={`chat-line-time-${messageId}`}
          fontSize={10}
          alignSelf="flex-end"
          color={metaInk}
        >
          {stamp}
        </Text>
      ) : null}
    </YStack>
  );
}
