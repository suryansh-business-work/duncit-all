import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The room's error line; tapping it dismisses it. Announced as it appears. */
export function ChatErrorBanner({
  error,
  onDismiss,
}: Readonly<{ error: string | null; onDismiss: () => void }>) {
  const { t } = useTranslation();
  const { onDanger } = useThemeColors();
  if (!error) return null;
  return (
    <XStack
      pressStyle={PRESS_STYLE.surface}
      testID="chat-room-error"
      role="button"
      tabIndex={0}
      aria-label={`${error}, ${t('mweb.chatRoom.dismissError')}`}
      aria-live="assertive"
      onPress={onDismiss}
      margin={12}
      padding={12}
      borderRadius={14}
      backgroundColor="$danger"
    >
      <Text flex={1} fontSize={13} color="$onDanger">
        {error}
      </Text>
      <MaterialIcons name="close" size={18} color={onDanger} />
    </XStack>
  );
}
