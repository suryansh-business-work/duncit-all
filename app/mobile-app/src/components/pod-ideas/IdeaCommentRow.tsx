import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodIdeaComment } from '@/hooks/usePodIdeas';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRelative } from '@/utils/date-format';

interface Props {
  comment: PodIdeaComment;
  canDelete: boolean;
  onDelete: () => void;
}

/** One idea comment: avatar initial · author · relative time · text, with a
 * delete affordance for the viewer's own comments. */
export function IdeaCommentRow({ comment, canDelete, onDelete }: Readonly<Props>) {
  const { muted } = useThemeColors();
  const author = comment.author;
  const initial = (author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <XStack gap={10} paddingVertical={10} alignItems="flex-start">
      <YStack
        width={34}
        height={34}
        borderRadius={17}
        backgroundColor="$surface"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={14} fontWeight="900" color="$color">
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
          testID={`idea-comment-delete-${comment.id}`}
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
