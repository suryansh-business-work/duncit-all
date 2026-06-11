import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { PostComment, PostDetail } from '@/hooks/usePostViewer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRelative } from '@/utils/date-format';

interface Props {
  post: PostDetail;
  meId?: string;
  onToggleLike: () => void;
  onDeleteComment: (commentId: string) => void;
}

/** One post comment: avatar initial · author · relative time · text, with a
 * delete affordance for the viewer's own comments. */
function PostCommentRow({
  comment,
  canDelete,
  onDelete,
}: Readonly<{ comment: PostComment; canDelete: boolean; onDelete: () => void }>) {
  const { muted } = useThemeColors();
  const author = comment.author;
  const initial = (author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <XStack gap={10} paddingVertical={8} alignItems="flex-start">
      <YStack
        width={32}
        height={32}
        borderRadius={16}
        backgroundColor="$surface"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={13} fontWeight="900" color="$color">
          {initial}
        </Text>
      </YStack>
      <YStack flex={1} gap={2}>
        <XStack gap={8} alignItems="center">
          <Text fontSize={13} fontWeight="800" color="$color">
            {author?.full_name ?? 'Member'}
          </Text>
          <Text fontSize={11} color="$muted">
            {formatRelative(comment.created_at)}
          </Text>
        </XStack>
        <Text fontSize={13.5} color="$color">
          {comment.text}
        </Text>
      </YStack>
      {canDelete ? (
        <XStack
          testID={`post-comment-delete-${comment.id}`}
          role="button"
          aria-label="Delete comment"
          onPress={onDelete}
          padding={4}
          pressStyle={{ opacity: 0.6 }}
        >
          <MaterialIcons name="delete-outline" size={18} color={muted} />
        </XStack>
      ) : null}
    </XStack>
  );
}

/** Scrollable lower pane of the post viewer: like row + the comment thread. */
export function PostViewerBody({ post, meId, onToggleLike, onDeleteComment }: Readonly<Props>) {
  const { muted, danger } = useThemeColors();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
      {post.caption ? (
        <Text fontSize={14} color="$color" paddingVertical={8}>
          {post.caption}
        </Text>
      ) : null}

      <XStack alignItems="center" gap={18} paddingVertical={10}>
        <XStack
          testID="post-like"
          role="button"
          aria-label="Like post"
          onPress={onToggleLike}
          alignItems="center"
          gap={6}
          pressStyle={{ opacity: 0.6 }}
        >
          <MaterialIcons
            name={post.liked_by_me ? 'favorite' : 'favorite-border'}
            size={20}
            color={post.liked_by_me ? danger : muted}
          />
          <Text fontSize={13.5} fontWeight="800" color="$muted">
            {post.likes_count}
          </Text>
        </XStack>
        <XStack alignItems="center" gap={6}>
          <MaterialIcons name="chat-bubble-outline" size={18} color={muted} />
          <Text fontSize={13.5} fontWeight="800" color="$muted">
            {post.comments_count}
          </Text>
        </XStack>
      </XStack>

      <Text fontSize={12} fontWeight="900" color="$muted" textTransform="uppercase">
        Comments ({post.comments_count})
      </Text>
      {post.comments.length === 0 ? (
        <Text testID="post-comments-empty" color="$muted" paddingVertical={12}>
          No comments yet.
        </Text>
      ) : (
        post.comments.map((comment) => (
          <PostCommentRow
            key={comment.id}
            comment={comment}
            canDelete={!!meId && (comment.author_id === meId || post.author_id === meId)}
            onDelete={() => onDeleteComment(comment.id)}
          />
        ))
      )}
    </ScrollView>
  );
}
