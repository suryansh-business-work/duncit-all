import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { PodIdeaDetail } from '@/hooks/usePodIdeas';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRelative } from '@/utils/date-format';
import { IdeaCommentRow } from './IdeaCommentRow';

interface Props {
  idea: PodIdeaDetail;
  myId?: string;
  onToggleLike: () => void;
  onDeleteComment: (commentId: string) => void;
}

const likeLabel = (count: number) => `${count} like${count === 1 ? '' : 's'}`;
const shareLabel = (count: number) => `${count} share${count === 1 ? '' : 's'}`;

/** Scrollable body of the idea details sheet: author, description, like/share
 * counts, and the comment thread. */
export function IdeaDetailsBody({ idea, myId, onToggleLike, onDeleteComment }: Readonly<Props>) {
  const { muted, danger } = useThemeColors();
  const author = idea.author;
  const initial = (author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
      <XStack gap={10} alignItems="center" paddingBottom={12}>
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="$surface"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={16} fontWeight="900" color="$color">
            {initial}
          </Text>
        </YStack>
        <YStack>
          <Text fontSize={14} fontWeight="800" color="$color">
            {author?.full_name ?? 'Member'}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {formatRelative(idea.created_at)}
          </Text>
        </YStack>
      </XStack>

      <Text fontSize={14.5} color="$color" lineHeight={21}>
        {idea.description}
      </Text>

      <XStack alignItems="center" gap={18} paddingVertical={14}>
        <XStack
          testID="idea-details-like"
          role="button"
          aria-label="Like idea"
          onPress={onToggleLike}
          alignItems="center"
          gap={6}
          pressStyle={{ opacity: 0.6 }}
        >
          <MaterialIcons
            name={idea.liked_by_me ? 'favorite' : 'favorite-border'}
            size={18}
            color={idea.liked_by_me ? danger : muted}
          />
          <Text fontSize={13} fontWeight="700" color="$muted">
            {likeLabel(idea.likes_count)}
          </Text>
        </XStack>
        <Text fontSize={13} color="$muted">
          {shareLabel(idea.shares_count)}
        </Text>
      </XStack>

      <Text fontSize={12} fontWeight="900" color="$muted" textTransform="uppercase">
        Comments ({idea.comments_count})
      </Text>
      {idea.comments.length === 0 ? (
        <Text testID="idea-comments-empty" color="$muted" paddingVertical={12}>
          No comments yet.
        </Text>
      ) : (
        idea.comments.map((comment) => (
          <IdeaCommentRow
            key={comment.id}
            comment={comment}
            canDelete={!!myId && comment.author_id === myId}
            onDelete={() => onDeleteComment(comment.id)}
          />
        ))
      )}
    </ScrollView>
  );
}
