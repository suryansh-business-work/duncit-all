import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Primary "Start a conversation" CTA → real-time agent chat. RN twin of mWeb's
 * StartConversation. */
export function StartConversation({ onPress }: Readonly<{ onPress: () => void }>) {
  const { t } = useTranslation();
  const { onPrimary, muted } = useThemeColors();
  return (
    <SurfaceCard
      testID="support-start-chat"
      role="button"
      aria-label={t('mweb.common.startAConversationWithSupport')}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap={12}
      pressStyle={PRESS_STYLE.surface}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
      >
        <MaterialIcons name="chat-bubble-outline" size={20} color={onPrimary} />
      </YStack>
      <Text flex={1} fontSize={15} fontWeight="600" color="$color">
        {t('mweb.common.startAConversation')}
      </Text>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </SurfaceCard>
  );
}
