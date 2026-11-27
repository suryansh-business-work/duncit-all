import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { MOBILE, RADII } from '@/constants/design';
import type { IconName } from './EmptyState';
import { Glyph, type AnyIcon } from './Glyph';

interface Props {
  title: string;
  subtitle?: string;
  /** An icon in a soft square: a Material name, or either set's icon. */
  icon?: IconName | AnyIcon;
  /** Any node in the icon's place (an avatar); wins over `icon`. */
  leading?: ReactNode;
  /** What sits at the row's end before the chevron: a count, a switch, a chip. */
  trailing?: ReactNode;
  /** A chevron says the row opens another screen; off for a row that acts in place. */
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * One row of a native grouped list (iOS Settings, Android preferences): an
 * icon, a title and an optional subtitle, something at the end, a chevron.
 * At least one platform touch target tall; the whole row is the button.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  trailing,
  chevron = true,
  destructive = false,
  onPress,
  onLongPress,
  testID,
  accessibilityLabel,
}: Readonly<Props>) {
  const theme = useTheme();
  const iconNode = icon ? (
    <YStack
      width={32}
      height={32}
      borderRadius={RADII.md}
      backgroundColor={destructive ? '$dangerSoft' : '$primarySoft'}
      alignItems="center"
      justifyContent="center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Glyph
        icon={typeof icon === 'string' ? { name: icon } : icon}
        size={MOBILE.iconSm}
        ink={destructive ? 'danger' : 'onPrimarySoft'}
      />
    </YStack>
  ) : null;
  return (
    <XStack
      role={onPress ? 'button' : undefined}
      aria-label={accessibilityLabel ?? title}
      onPress={onPress}
      onLongPress={onLongPress}
      minHeight={MOBILE.touch}
      alignItems="center"
      gap="$3"
      paddingHorizontal="$3"
      paddingVertical="$2.5"
      pressStyle={onPress ? { backgroundColor: '$hover' } : undefined}
      testID={testID}
    >
      {leading ?? iconNode}
      <YStack flex={1} gap="$0.5">
        <Text color={destructive ? '$danger' : '$color'} fontWeight="500" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text color="$muted" fontSize="$2" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </YStack>
      {trailing}
      {chevron && onPress ? (
        <MaterialIcons name="chevron-right" size={MOBILE.icon} color={theme.muted?.val} />
      ) : null}
    </XStack>
  );
}
