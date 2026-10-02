import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** "Back out" heading and the sheet's close button (inert while busy). */
export function BackoutHeader({
  color,
  onClose,
}: Readonly<{ color: string; onClose: (() => void) | undefined }>) {
  const { t } = useTranslation();
  return (
    <XStack alignItems="center" justifyContent="space-between" padding={16}>
      <Text role="heading" fontSize={18} fontWeight="700" color="$color">
        {t('mweb.podDetails.backoutTitle')}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID="backout-close"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.podDetails.close')}
        hitSlop={6}
        onPress={onClose}
        width={32}
        height={32}
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="close" size={20} color={color} />
      </XStack>
    </XStack>
  );
}
