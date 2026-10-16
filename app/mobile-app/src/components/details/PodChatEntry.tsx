import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { canOpenPodChat, type PodChatAccessInput } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface PodChatEntryProps extends PodChatAccessInput {
  onOpen: () => void;
}

/**
 * The Pod Chat door on every pod's details. A host, an attendee or a JOINED
 * booking opens the room; anyone else sees it disabled with the reason beside
 * it. mWeb twin: pod-details-page/PodChatEntry.
 */
export function PodChatEntry({ onOpen, ...access }: Readonly<PodChatEntryProps>) {
  const { primary, muted } = useThemeColors();
  const { t } = useTranslation();
  const canChat = canOpenPodChat(access);
  const hint = canChat ? t('mweb.chat.podChatHint') : t('mweb.chat.podChatLocked');
  return (
    <XStack alignItems="center" gap={12} paddingHorizontal={16} testID="pod-chat-entry">
      <DuncitButton
        testID="pod-chat-open"
        label={t('mweb.chat.podChat')}
        variant="outline"
        size="sm"
        disabled={!canChat}
        accessibilityHint={hint}
        icon={
          <MaterialIcons name="chat-bubble-outline" size={16} color={canChat ? primary : muted} />
        }
        onPress={onOpen}
      />
      <Text flex={1} fontSize={13} color="$muted" testID="pod-chat-hint">
        {hint}
      </Text>
    </XStack>
  );
}
