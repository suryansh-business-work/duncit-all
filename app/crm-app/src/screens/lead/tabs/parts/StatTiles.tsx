import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import type { IconName } from './DetailCard';

export interface StatTileItem {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  /** The theme colour of the icon: the portal tile's accent. */
  tone: 'accentText' | 'info' | 'success' | 'warning';
}

/** The portal's LeadStatTile row on a phone, two to a row: icon, label in capitals, the value and its hint. */
export function StatTiles({ items }: Readonly<{ items: readonly StatTileItem[] }>) {
  const theme = useTheme();
  return (
    <XStack flexWrap="wrap" gap="$2">
      {items.map((tile) => (
        <YStack
          key={tile.key}
          flexBasis="46%"
          flexGrow={1}
          gap="$1"
          padding="$3"
          borderRadius={RADII.md}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          accessible
          aria-label={`${tile.label}: ${tile.value}. ${tile.hint}`}
          testID={`stat-tile-${tile.key}`}
        >
          <XStack alignItems="center" gap="$2">
            <MaterialIcons
              name={tile.icon}
              size={18}
              color={theme[tile.tone]?.val}
              accessibilityElementsHidden
            />
            <Text
              flex={1}
              color="$muted"
              fontSize="$1"
              fontWeight="700"
              letterSpacing={0.4}
              textTransform="uppercase"
              numberOfLines={1}
            >
              {tile.label}
            </Text>
          </XStack>
          <Text fontSize="$6" fontWeight="800" numberOfLines={1}>
            {tile.value}
          </Text>
          <Text color="$muted" fontSize="$2" numberOfLines={2}>
            {tile.hint}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}
