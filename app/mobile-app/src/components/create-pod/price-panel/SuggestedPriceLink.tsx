import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { SUGGESTED_PRICES_LINK } from './step4-copy';

/** The "Suggested Price ⓘ" link that sits to the RIGHT of the Ticket Price
 * label and opens the suggestions modal. mWeb twin. */
export function SuggestedPriceLink({ onPress }: Readonly<{ onPress: () => void }>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID="suggested-price-link"
      role="button"
      aria-label={SUGGESTED_PRICES_LINK}
      onPress={onPress}
      alignItems="center"
      gap={4}
      pressStyle={{ opacity: 0.6 }}
    >
      <Text fontSize={13} fontWeight="700" color="$primary" textDecorationLine="underline">
        {SUGGESTED_PRICES_LINK}
      </Text>
      <MaterialIcons name="info-outline" size={15} color={primary} />
    </XStack>
  );
}
