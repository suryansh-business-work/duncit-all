import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import type { PodIdea } from '@/hooks/usePodIdeas';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRelative } from '@/utils/date-format';

interface Props {
  idea: PodIdea;
  myId?: string;
  onOpen: () => void;
  onLike: () => void;
  onShare: () => void;
  onDelete: () => void;
  showStatus?: boolean;
}

/** Colour for the submission-status chip (only shown on the viewer's own ideas). */
function statusColor(status: string): string {
  if (status === 'APPROVED') return semantic.success;
  if (status === 'REJECTED') return semantic.error;
  return semantic.warning;
}

/** A single pod idea: author header, title/description (tap to open), and the
 * like / comment / share action row. RN port of mWeb's IdeaCard. */
export function IdeaCard({
  idea,
  myId,
  onOpen,
  onLike,
  onShare,
  onDelete,
  showStatus,
}: Readonly<Props>) {
  const { muted, danger } = useThemeColors();
  const author = idea.author;
  const isMine = !!myId && idea.author_id === myId;
  const initial = (author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <YStack
      testID={`idea-card-${idea.id}`}
      gap={10}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={10}>
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="$background"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={15} fontWeight="900" color="$color">
            {initial}
          </Text>
        </YStack>
        <YStack flex={1}>
          <Text fontSize={13.5} fontWeight="800" color="$color" numberOfLines={1}>
            {author?.full_name ?? 'Member'}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {formatRelative(idea.created_at)}
          </Text>
        </YStack>
        {showStatus ? (
          <XStack
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={999}
            backgroundColor={statusColor(idea.status)}
          >
            <Text fontSize={10} fontWeight="900" color="#ffffff">
              {idea.status}
            </Text>
          </XStack>
        ) : null}
        {isMine ? (
          <XStack
            testID={`idea-delete-${idea.id}`}
            role="button"
            aria-label="Delete idea"
            onPress={onDelete}
            padding={4}
            pressStyle={{ opacity: 0.6 }}
          >
            <MaterialIcons name="delete-outline" size={18} color={danger} />
          </XStack>
        ) : null}
      </XStack>

      <YStack role="button" aria-label={idea.title} onPress={onOpen} gap={4}>
        <Text fontSize={16} fontWeight="900" color="$color">
          {idea.title}
        </Text>
        <Text fontSize={13.5} color="$muted" numberOfLines={4} lineHeight={19}>
          {idea.description}
        </Text>
      </YStack>

      <XStack alignItems="center" gap={20}>
        <XStack
          testID={`idea-like-${idea.id}`}
          role="button"
          aria-label="Like idea"
          onPress={onLike}
          alignItems="center"
          gap={5}
          pressStyle={{ opacity: 0.6 }}
        >
          <MaterialIcons
            name={idea.liked_by_me ? 'favorite' : 'favorite-border'}
            size={17}
            color={idea.liked_by_me ? danger : muted}
          />
          <Text fontSize={12.5} fontWeight="700" color="$muted">
            {idea.likes_count}
          </Text>
        </XStack>
        <XStack
          testID={`idea-comment-${idea.id}`}
          role="button"
          aria-label="Comment on idea"
          onPress={onOpen}
          alignItems="center"
          gap={5}
          pressStyle={{ opacity: 0.6 }}
        >
          <MaterialIcons name="chat-bubble-outline" size={16} color={muted} />
          <Text fontSize={12.5} fontWeight="700" color="$muted">
            {idea.comments_count}
          </Text>
        </XStack>
        <XStack
          testID={`idea-share-${idea.id}`}
          role="button"
          aria-label="Share idea"
          onPress={onShare}
          alignItems="center"
          gap={5}
          pressStyle={{ opacity: 0.6 }}
        >
          <MaterialIcons name="share" size={16} color={muted} />
          <Text fontSize={12.5} fontWeight="700" color="$muted">
            {idea.shares_count}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
