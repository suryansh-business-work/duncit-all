import { Text, YStack } from 'tamagui';

import { MOBILE } from '@/constants/design';
import { haptics } from '@/services/haptics';
import { Glyph, type AnyIcon } from './Glyph';

interface Props {
  icon: AnyIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Longer than the visible label (WCAG 2.5.3: it must start with the label). */
  accessibilityLabel?: string;
  testID?: string;
}

const BADGE = 36;

/**
 * An icon over a short label, the way Phone and Contacts lay out Call, Message
 * and Mail: one per column of a bottom action bar.
 */
export function QuickAction({
  icon,
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  testID,
}: Readonly<Props>) {
  const press = () => {
    haptics.tap();
    onPress();
  };
  return (
    <YStack
      flex={1}
      role="button"
      aria-label={accessibilityLabel ?? label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={disabled ? undefined : press}
      minHeight={MOBILE.touch}
      alignItems="center"
      justifyContent="center"
      gap="$1"
      paddingVertical="$1.5"
      borderRadius="$4"
      opacity={disabled ? 0.4 : 1}
      pressStyle={{ backgroundColor: '$hover' }}
      testID={testID}
    >
      <YStack
        width={BADGE}
        height={BADGE}
        borderRadius={BADGE / 2}
        backgroundColor="$primarySoft"
        alignItems="center"
        justifyContent="center"
      >
        <Glyph icon={icon} ink="onPrimarySoft" size={MOBILE.iconSm + 2} />
      </YStack>
      <Text fontSize="$1" fontWeight="600" color="$color" numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}
