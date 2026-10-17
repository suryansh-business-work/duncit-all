import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import type { PreviewLine } from '@/hooks/useChatPreview';
import { useTranslation } from '@/hooks/useTranslation';

const AVATAR = 32;

/** One read-only line of the chat card: who said it and the first two lines of
 * it. mWeb twin: components/chat-preview/ChatPreviewLine. */
export function ChatPreviewLine({ message }: Readonly<{ message: PreviewLine }>) {
  const { t } = useTranslation();
  const text = message.type === 'IMAGE' ? t('mweb.chat.lastPhoto') : message.text;
  return (
    <XStack gap={10} alignItems="flex-end" testID={`chat-preview-line-${message.id}`}>
      <YStack
        width={AVATAR}
        height={AVATAR}
        borderRadius={AVATAR / 2}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {message.user_photo ? (
          <AppImage
            source={{ uri: message.user_photo }}
            style={{ width: AVATAR, height: AVATAR }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={13} fontWeight="700" color="$onPrimary">
            {(message.user_name || '?').charAt(0)}
          </Text>
        )}
      </YStack>
      <YStack flexShrink={1} gap={2}>
        <Text fontSize={12} fontWeight="600" color="$success">
          {message.user_name}
        </Text>
        <YStack
          backgroundColor="$surface"
          borderColor="$cardBorder"
          borderWidth={1}
          borderRadius={16}
          paddingHorizontal={12}
          paddingVertical={6}
        >
          <Text fontSize={14} color="$color" numberOfLines={2}>
            {text}
          </Text>
        </YStack>
      </YStack>
    </XStack>
  );
}
