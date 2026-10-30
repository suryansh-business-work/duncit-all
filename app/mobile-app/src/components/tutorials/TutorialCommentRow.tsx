import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { TutorialCommentItem } from '@/hooks/useTutorialComments';

interface Props {
  comment: TutorialCommentItem;
  onRequestDelete: () => void;
}

/** One comment: avatar, name, text — and a delete button on the member's own. */
export function TutorialCommentRow({ comment, onRequestDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const name = comment.author?.full_name || t('mweb.tutorials.member');
  const photo = comment.author?.profile_photo;
  return (
    <XStack gap={10} paddingVertical={10} alignItems="flex-start" testID={`tutorial-comment-${comment.id}`}>
      {photo ? (
        <AppImage source={{ uri: photo }} style={{ width: 32, height: 32, borderRadius: 16 }} />
      ) : (
        <YStack width={32} height={32} borderRadius={16} backgroundColor="$soft" alignItems="center" justifyContent="center">
          <MaterialIcons name="person" size={18} color={muted} />
        </YStack>
      )}
      <YStack flex={1} gap={2}>
        <Text fontSize={13} fontWeight="600" color="$color">
          {name}
        </Text>
        <Text fontSize={14} color="$color">
          {comment.text}
        </Text>
      </YStack>
      {comment.is_mine ? (
        <XStack
          testID={`tutorial-comment-delete-${comment.id}`}
          role="button"
          tabIndex={0}
          aria-label={t('mweb.tutorials.commentDelete')}
          onPress={onRequestDelete}
          pressStyle={PRESS_STYLE.control}
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="delete-outline" size={20} color={muted} />
        </XStack>
      ) : null}
    </XStack>
  );
}
