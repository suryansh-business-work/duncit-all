import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/**
 * Chat with Us — a single entry point into the real-time agent chat. The ticket
 * inbox and the "New ticket" shortcut that used to live here have been removed:
 * this screen now offers only "Chat live with an agent".
 */
export function ChatWithUsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { onPrimary, muted } = useThemeColors();

  return (
    <StackScreen title={t('mweb.common.chatWithUs')} testID="chat-with-us-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <SurfaceCard
          testID="chat-live-card"
          role="button"
          aria-label={t('mweb.chatWithUs.chatLiveWithAnAgent')}
          onPress={() => navigation.navigate('LiveChat')}
          flexDirection="row"
          alignItems="center"
          gap={12}
          pressStyle={PRESS_STYLE.surface}
        >
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name="forum" size={20} color={onPrimary} />
          </YStack>
          <Text flex={1} fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
            {t('mweb.chatWithUs.chatLiveWithAnAgent')}
          </Text>
          <MaterialIcons name="chevron-right" size={22} color={muted} />
        </SurfaceCard>
      </RefreshScrollView>
    </StackScreen>
  );
}
