import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import type { PodComment } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';

function relativeTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true });
}

interface Props {
  comment: PodComment;
  canDelete: boolean;
  onToggleLike: () => void;
  onRequestDelete: () => void;
  onOpenProfile: () => void;
}

/** One comment: profile picture · author · time · text, with a like reaction and
 * — for the viewer's own comments — a long-press to delete (explore items 3,4,5,11). */
export function CommentRow({
  comment,
  canDelete,
  onToggleLike,
  onRequestDelete,
  onOpenProfile,
}: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const liked = comment.liked_by_me;
  return (
    <XStack
      testID={`comment-row-${comment.id}`}
      gap={10}
      paddingVertical={10}
      alignItems="flex-start"
      onLongPress={canDelete ? onRequestDelete : undefined}
    >
      <PressScale
        testID={`comment-avatar-${comment.id}`}
        accessibilityLabel={comment.author_name || 'Open profile'}
        onPress={onOpenProfile}
      >
        {comment.author_photo ? (
          <AppImage
            source={{ uri: comment.author_photo }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
          />
        ) : (
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
        )}
      </PressScale>
      <YStack flex={1} gap={2}>
        <XStack gap={8} alignItems="center">
          <Text
            testID={`comment-name-${comment.id}`}
            role="button"
            aria-label={`Open ${comment.author_name || 'profile'}`}
            onPress={onOpenProfile}
            fontSize={13.5}
            fontWeight="800"
            color="$color"
          >
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
      <XStack
        testID={`comment-like-${comment.id}`}
        role="button"
        aria-label="Like comment"
        onPress={onToggleLike}
        alignItems="center"
        gap={3}
        paddingHorizontal={4}
        paddingVertical={2}
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons
          name={liked ? 'favorite' : 'favorite-border'}
          size={16}
          color={liked ? primary : muted}
        />
        {comment.like_count > 0 ? (
          <Text fontSize={11.5} fontWeight="700" color={liked ? '$primary' : '$muted'}>
            {comment.like_count}
          </Text>
        ) : null}
      </XStack>
    </XStack>
  );
}
