import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The filter sheet's title row — its heading and the close button. Split out
 * of HomeFilterSheet so that file stays under the 200-line cap. */
export function HomeFilterSheetHeader({ onClose }: Readonly<{ onClose: () => void }>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  return (
    <XStack alignItems="center" justifyContent="space-between" padding={16}>
      <Text testID="home-filter-title" role="heading" fontSize={17} fontWeight="600" color="$color">
        {t('mweb.common.filters')}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID="home-filter-close"
        role="button"
        aria-label={t('mweb.common.close')}
        tabIndex={0}
        hitSlop={4}
        onPress={onClose}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        backgroundColor="$surface"
      >
        <MaterialIcons name="close" size={20} color={color} />
      </XStack>
    </XStack>
  );
}
