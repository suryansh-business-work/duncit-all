import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { AppHeader } from '@/components/AppHeader';
import { useGoBack } from '@/hooks/useGoBack';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface StackScreenProps {
  title: string;
  testID: string;
  children: ReactNode;
  right?: ReactNode;
  /** Render the full app header (logo · bell · avatar) above the back bar —
   * used by the studio dashboards so the header shows in every role (B4-3). */
  header?: boolean;
}

/** Shared scaffold for pushed (stack) screens: gradient backdrop + a back-bar
 * with the title (and optional right action). */
export function StackScreen({
  title,
  testID,
  children,
  right,
  header = false,
}: Readonly<StackScreenProps>) {
  const goBack = useGoBack();
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();

  return (
    <YStack flex={1} testID={testID}>
      <AppBackground />
      {/* `bottom` as well as `top`: a pushed screen has no floating tab bar to
          reserve that strip, and the edge-to-edge window Expo SDK 54 forces on
          Android paints the navigation bar over the app — without this the last
          row of every stack screen is clipped by it. (Tab screens deliberately
          stay top-only; their content already reserves the strip through
          `useBottomNavSpace`, so adding it here too would double it.) */}
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {header ? <AppHeader /> : null}
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID={`${testID}-back`}
            role="button"
            aria-label={t('mweb.common.goBack')}
            onPress={goBack}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text flex={1} fontSize={18} fontWeight="600" color="$color" numberOfLines={1}>
            {title}
          </Text>
          {right}
        </XStack>
        <KeyboardScreen>{children}</KeyboardScreen>
      </SafeAreaView>
    </YStack>
  );
}
