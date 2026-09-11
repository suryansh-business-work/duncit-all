import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  title: string;
  onBack: () => void;
  /** Opens the linked pod's detail page (the title is tappable). */
  onOpenPod: () => void;
}

/** The chat room's top bar: a round back button and the tappable pod title.
 * mWeb twin: chat-room-page/ChatRoomHeader. */
export function ChatRoomHeaderBar({ title, onBack, onOpenPod }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, muted } = useThemeColors();
  return (
    <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={8}>
      <XStack
        testID="chat-room-back"
        role="button"
        aria-label={t('mweb.common.goBack')}
        onPress={onBack}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="arrow-back" size={22} color={ink} />
      </XStack>
      <XStack
        testID="chat-room-title"
        role="button"
        aria-label={`Open pod details for ${title}`}
        onPress={onOpenPod}
        flex={1}
        alignItems="center"
        gap={4}
        pressStyle={PRESS_STYLE.row}
      >
        <Text fontSize={17} fontWeight="600" color="$color" numberOfLines={1} flex={1}>
          {title}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={muted} />
      </XStack>
    </XStack>
  );
}
