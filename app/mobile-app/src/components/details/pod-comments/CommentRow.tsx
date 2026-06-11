import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Text, XStack, YStack } from 'tamagui';

import type { PodComment } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';

function relativeTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true });
}

/** One comment: avatar initial · author · relative time · text, with a delete
 * affordance for the viewer's own comments. */
export function CommentRow({
  comment,
  canDelete,
  onDelete,
}: Readonly<{
  comment: PodComment;
  canDelete: boolean;
  onDelete: () => void;
}>) {
  const { muted } = useThemeColors();
  return (
    <XStack gap={10} paddingVertical={10} alignItems="flex-start">
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        backgroundColor="$surface"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={15} fontWeight="900" color="$color">
          {(comment.author_name || '?').slice(0, 1).toUpperCase()}
        </Text>
      </YStack>
      <YStack flex={1} gap={2}>
        <XStack gap={8} alignItems="center">
          <Text fontSize={13.5} fontWeight="800" color="$color">
            {comment.author_name || 'Anon'}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {relativeTime(comment.created_at)}
          </Text>
        </XStack>
        <Text fontSize={13.5} color="$color">
          {comment.text}
        </Text>
      </YStack>
      {canDelete ? (
        <XStack
          testID={`comment-delete-${comment.id}`}
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
