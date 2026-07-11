import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { MenuRoute } from '@/navigation/types';
import { PROFILE_GRID, type ProfileTile } from './profileSections';

/** Pink-tinted icon chip background — mirrors mWeb's alpha(primary, 0.14). */
const PINK_CHIP = 'rgba(255,87,87,0.14)';

function GridTile({
  tile,
  onNavigate,
}: Readonly<{ tile: ProfileTile; onNavigate: (route: MenuRoute) => void }>) {
  const { primary } = useThemeColors();
  return (
    <YStack
      testID={`sidebar-grid-${tile.key}`}
      role="button"
      aria-label={tile.label}
      onPress={() => onNavigate(tile.route)}
      width="48%"
      flexGrow={1}
      gap={8}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={12}
      pressStyle={{ opacity: 0.85, borderColor: '$primary' }}
    >
      <YStack
        width={36}
        height={36}
        alignItems="center"
        justifyContent="center"
        borderRadius={8}
        backgroundColor={PINK_CHIP}
      >
        <MaterialIcons name={tile.icon} size={20} color={primary} />
      </YStack>
      <YStack gap={2}>
        <Text numberOfLines={1} fontSize={14} fontWeight="800" color="$color">
          {tile.label}
        </Text>
        <Text numberOfLines={1} fontSize={11.5} color="$muted">
          {tile.caption}
        </Text>
      </YStack>
    </YStack>
  );
}

/** 2×2 quick-action grid — RN port of mWeb's <QuickActionGrid/>. */
export function SidebarQuickGrid({
  onNavigate,
}: Readonly<{ onNavigate: (route: MenuRoute) => void }>) {
  return (
    <XStack
      paddingHorizontal={16}
      paddingBottom={10}
      flexWrap="wrap"
      gap={10}
      justifyContent="space-between"
    >
      {PROFILE_GRID.map((tile) => (
        <GridTile key={tile.key} tile={tile} onNavigate={onNavigate} />
      ))}
    </XStack>
  );
}
