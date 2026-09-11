import type { ComponentProps, ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  testID: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  /** A line under the label — why the door is shut, say. */
  caption?: string;
  captionTestID?: string;
  /** A small accent badge before the chevron — "3 pending". */
  badge?: ReactNode;
  /** Shown but inert — a door that opens only once something is approved. */
  disabled?: boolean;
}

/** One door in a list card: the accent glyph on a soft disc, the label, and a
 * muted chevron. mWeb twin: components/club-admin/QuickActionList's row. */
export function NavRow({
  testID,
  icon,
  label,
  onPress,
  caption,
  captionTestID,
  badge,
  disabled = false,
}: Readonly<Props>) {
  const { accent, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      pressStyle={disabled ? undefined : PRESS_STYLE.row}
      alignItems="center"
      gap={12}
      minHeight={60}
      paddingHorizontal={16}
      paddingVertical={12}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name={icon} size={20} color={accent} />
      </YStack>
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {label}
        </Text>
        {caption ? (
          <Text testID={captionTestID} fontSize={12} color="$muted">
            {caption}
          </Text>
        ) : null}
      </YStack>
      {badge}
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}

/** The accent count pill a row carries — mWeb's `Chip color="secondary"`. */
export function RowBadge({ testID, label }: Readonly<{ testID?: string; label: string }>) {
  return (
    <XStack
      testID={testID}
      height={24}
      paddingHorizontal={8}
      alignItems="center"
      borderRadius={999}
      backgroundColor="$accent"
    >
      <Text fontSize={13} fontWeight="600" color="$onPrimary">
        {label}
      </Text>
    </XStack>
  );
}

/** The hairline between two rows of a list card, inset 16 either side. */
export function RowDivider() {
  return <YStack height={1} marginHorizontal={16} backgroundColor="$borderColor" />;
}
