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

/** Shared scaffold for pushed (stack) screens: the app ground + a back-bar with
 * the title (and optional right action). The calm inner-page header: a 40px
 * round surface back button, the title at 17/600 — centred when a right action
 * balances it — and no subtitle. mWeb twin: components/StudioPageHeader. */
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
  const titleAlign = right ? 'center' : 'left';

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
        <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={8}>
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
            borderWidth={1}
            borderColor="$cardBorder"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.control}
          >
            <MaterialIcons name="arrow-back" size={20} color={ink} />
          </XStack>
          <Text
            flex={1}
            fontSize={17}
            fontWeight="600"
            color="$color"
            textAlign={titleAlign}
            numberOfLines={1}
          >
            {title}
          </Text>
          {right}
        </XStack>
        <KeyboardScreen>{children}</KeyboardScreen>
      </SafeAreaView>
    </YStack>
  );
}
