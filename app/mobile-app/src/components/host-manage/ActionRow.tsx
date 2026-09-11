import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useInRowGroup } from '@/components/host-manage/RowGroup';

export type ActionIconName = keyof typeof MaterialIcons.glyphMap;

interface ActionRowProps {
  testID: string;
  icon: ActionIconName;
  label: string;
  tint: string;
  danger?: boolean;
  /** Buttons pinned to the right of the row, for a line that does more than
   * one thing (the rating link is opened, shared or copied). */
  trailing?: ReactNode;
  /** Shown but inert — for a door that opens only once something is approved. */
  disabled?: boolean;
  onPress: () => void;
}

/** One tappable action line. Inside a RowGroup it is a bare row — the card
 * around the list draws the surface and the dividers; on its own it is a calm
 * surface tile. */
export function ActionRow({
  testID,
  icon,
  label,
  tint,
  danger,
  trailing,
  disabled = false,
  onPress,
}: Readonly<ActionRowProps>) {
  const grouped = useInRowGroup();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      opacity={disabled ? 0.5 : 1}
      alignItems="center"
      gap={12}
      height={52}
      paddingLeft={16}
      paddingRight={trailing ? 6 : 16}
      borderRadius={grouped ? 0 : 16}
      borderWidth={grouped ? 0 : 1}
      borderColor="$cardBorder"
      backgroundColor={grouped ? 'transparent' : '$surface'}
      pressStyle={grouped ? PRESS_STYLE.row : PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={20} color={tint} />
      <Text flex={1} fontSize={15} fontWeight="500" color={danger ? '$danger' : '$color'}>
        {label}
      </Text>
      {trailing}
    </XStack>
  );
}

interface RowIconButtonProps {
  testID: string;
  icon: ActionIconName;
  label: string;
  tint: string;
  onPress: () => void;
}

/** A secondary tap target sitting inside a row — its own press target, so it
 * never triggers the row it lives in. */
export function RowIconButton({
  testID,
  icon,
  label,
  tint,
  onPress,
}: Readonly<RowIconButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name={icon} size={19} color={tint} />
    </XStack>
  );
}
