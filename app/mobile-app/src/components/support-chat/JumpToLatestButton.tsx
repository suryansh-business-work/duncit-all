import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  testID: string;
  /** Distance from the bottom edge (chat sits above the composer). */
  bottom: number;
  onPress: () => void;
}

/** Floating "jump to latest" button shown after the user scrolls up (B13). */
export function JumpToLatestButton({ testID, bottom, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      pressStyle={PRESS_STYLE.surface}
      testID={testID}
      role="button"
      aria-label={t('mweb.common.jumpToLatest')}
      onPress={onPress}
      position="absolute"
      right={16}
      bottom={bottom}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      backgroundColor="$primary"
    >
      <MaterialIcons name="keyboard-arrow-down" size={24} color={onPrimary} />
    </XStack>
  );
}
