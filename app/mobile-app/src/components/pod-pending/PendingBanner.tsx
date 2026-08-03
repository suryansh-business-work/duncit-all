import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';

// TODO(i18n) — banner copy ships as literals until this feature is localized.
const HEADING = 'Your Pod will go live once the venue accepts your slot request.';
const SUBHEADING =
  "We've sent your slot request to the venue. You'll be notified as soon as the venue approves or declines your request.";

/** Top banner of the waiting screen — big yellow tick, heading + subheading,
 * top-center aligned. mWeb twin (rule 27). */
export function PendingBanner() {
  return (
    <YStack testID="pod-pending-banner" alignItems="center" gap={10} paddingVertical={16}>
      <MaterialIcons name="check-circle" size={64} color={semantic.warning} />
      <Text fontSize={17} fontWeight="700" color="$color" textAlign="center">
        {HEADING}
      </Text>
      <Text fontSize={13} color="$muted" textAlign="center">
        {SUBHEADING}
      </Text>
    </YStack>
  );
}
