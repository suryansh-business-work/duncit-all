import type { ComponentProps, ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type RowTone = 'default' | 'danger';

export interface SidebarRowProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  testID?: string;
  /** A muted second line — only for information (the active studio). */
  secondary?: string;
  /** A small pill after the label, e.g. "Coming soon". */
  badge?: string;
  /** A control on the right (a switch, an expand arrow). */
  trailing?: ReactNode;
  /** The muted chevron that says "this opens somewhere". */
  chevron?: boolean;
  tone?: RowTone;
}

/**
 * One row of the menu's grouped lists: a 36px soft disc with the icon, the
 * label at 15/500, then a badge, a trailing control or the muted chevron.
 * Every menu row renders through this so the lists cannot drift. mWeb twin:
 * profile-drawer/MenuRow.
 */
export function SidebarRow({
  icon,
  label,
  onPress,
  testID,
  secondary,
  badge,
  trailing,
  chevron = true,
  tone = 'default',
}: Readonly<SidebarRowProps>) {
  const { color: ink, muted, danger } = useThemeColors();
  const isDanger = tone === 'danger';
  const iconColor = isDanger ? danger : ink;
  const labelColor = isDanger ? '$danger' : '$color';
  return (
    <XStack
      testID={testID}
      role={onPress ? 'button' : undefined}
      aria-label={onPress ? label : undefined}
      onPress={onPress}
      alignItems="center"
      gap={12}
      minHeight={60}
      paddingHorizontal={16}
      paddingVertical={12}
      pressStyle={onPress ? PRESS_STYLE.row : undefined}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </YStack>
      <YStack flex={1} minWidth={0}>
        <Text numberOfLines={1} fontSize={15} fontWeight="500" color={labelColor}>
          {label}
        </Text>
        {secondary ? (
          <Text numberOfLines={1} fontSize={12} color="$muted">
            {secondary}
          </Text>
        ) : null}
      </YStack>
      {badge ? (
        <Text
          fontSize={11}
          fontWeight="600"
          color="$accent"
          backgroundColor="$soft"
          borderRadius={999}
          paddingHorizontal={8}
          paddingVertical={3}
          overflow="hidden"
        >
          {badge}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <MaterialIcons name="chevron-right" size={20} color={muted} /> : null}
    </XStack>
  );
}
