import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The "Suggested Price ⓘ" link that sits to the RIGHT of the Ticket Price
 * label and opens the suggestions modal. mWeb twin. */
export function SuggestedPriceLink({ onPress }: Readonly<{ onPress: () => void }>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const label = t('mweb.createPod.suggestedPrice');
  return (
    <XStack
      testID="suggested-price-link"
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={4}
      pressStyle={PRESS_STYLE.inline}
    >
      <Text fontSize={13} fontWeight="700" color="$primary" textDecorationLine="underline">
        {label}
      </Text>
      <MaterialIcons name="info-outline" size={15} color={primary} />
    </XStack>
  );
}
