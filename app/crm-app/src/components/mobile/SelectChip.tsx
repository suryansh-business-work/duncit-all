import type { ReactNode } from 'react';
import { Text, XStack } from 'tamagui';

import { MOBILE, RADII } from '@/constants/design';
import { haptics } from '@/services/haptics';

/** How tall a chip draws; its touch area is still a full touch target. */
const CHIP_HEIGHT = 36;

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  /** Must start with `label` (WCAG 2.5.3). */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * One choice of a set (a range, a filter, a sort), as a phone draws it: a
 * pill, the picked one on the soft accent wash, the rest outlined on the
 * surface. Replaces solid/outline button pairs, which read like a web toolbar.
 */
export function SelectChip({
  label,
  selected,
  onPress,
  disabled = false,
  icon,
  accessibilityLabel,
  testID,
}: Readonly<Props>) {
  const press = () => {
    // A tick only when the choice changes; the picked one again is quiet.
    if (!selected) haptics.tap();
    onPress();
  };
  return (
    <XStack
      accessible
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      aria-label={accessibilityLabel ?? label}
      onPress={disabled ? undefined : press}
      minHeight={CHIP_HEIGHT}
      hitSlop={(MOBILE.touch - CHIP_HEIGHT) / 2}
      paddingHorizontal="$3"
      gap="$1.5"
      alignItems="center"
      borderRadius={RADII.pill}
      borderWidth={1}
      borderColor={selected ? '$primarySoft' : '$borderColor'}
      backgroundColor={selected ? '$primarySoft' : '$surface'}
      opacity={disabled ? 0.4 : 1}
      pressStyle={{ backgroundColor: '$hover' }}
      testID={testID}
    >
      {icon}
      <Text
        fontSize="$3"
        fontWeight={selected ? '700' : '500'}
        color={selected ? '$onPrimarySoft' : '$color'}
      >
        {label}
      </Text>
    </XStack>
  );
}
