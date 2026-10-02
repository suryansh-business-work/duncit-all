import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The in-sheet "delete this comment?" confirmation. */
export function DeleteCommentConfirm({
  onCancel,
  onConfirm,
}: Readonly<{ onCancel: () => void; onConfirm: () => void }>) {
  const { t } = useTranslation();
  return (
    <YStack
      testID="comment-delete-confirm"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      alignItems="center"
      justifyContent="center"
      backgroundColor="rgba(0,0,0,0.55)"
      padding={28}
    >
      <YStack
        width="100%"
        maxWidth={360}
        gap={6}
        padding={20}
        borderRadius={28}
        backgroundColor="$surface"
      >
        <Text role="heading" fontSize={17} fontWeight="600" color="$color">
          {t('mweb.podDetails.deleteCommentTitle')}
        </Text>
        <Text fontSize={13} color="$muted">
          {t('mweb.podDetails.deleteCommentBody')}
        </Text>
        <XStack gap={10} marginTop={12} justifyContent="flex-end">
          <XStack
            pressStyle={PRESS_STYLE.surface}
            testID="comment-delete-cancel"
            role="button"
            tabIndex={0}
            aria-label={t('mweb.podDetails.cancel')}
            onPress={onCancel}
            height={44}
            paddingHorizontal={18}
            borderRadius={999}
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize={14} fontWeight="600" color="$color">
              {t('mweb.podDetails.cancel')}
            </Text>
          </XStack>
          <XStack
            pressStyle={PRESS_STYLE.surface}
            testID="comment-delete-confirm-btn"
            role="button"
            tabIndex={0}
            aria-label={t('mweb.podDetails.delete')}
            onPress={onConfirm}
            height={44}
            paddingHorizontal={18}
            borderRadius={999}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$danger"
          >
            <Text fontSize={14} fontWeight="600" color="$onPrimary">
              {t('mweb.podDetails.delete')}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
