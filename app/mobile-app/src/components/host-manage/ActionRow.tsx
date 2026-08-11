import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

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
  onPress: () => void;
}

/** One tappable action line inside the host's pod-actions sheet. */
export function ActionRow({
  testID,
  icon,
  label,
  tint,
  danger,
  trailing,
  onPress,
}: Readonly<ActionRowProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={12}
      height={52}
      paddingLeft={14}
      paddingRight={trailing ? 6 : 14}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={20} color={tint} />
      <Text flex={1} fontSize={14.5} fontWeight="600" color={danger ? '$danger' : '$color'}>
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
      pressStyle={{ opacity: 0.6 }}
    >
      <MaterialIcons name={icon} size={19} color={tint} />
    </XStack>
  );
}
