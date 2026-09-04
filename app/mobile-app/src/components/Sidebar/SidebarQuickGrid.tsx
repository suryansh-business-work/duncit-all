import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { TourAnchor } from '@/tours/TourAnchor';
import type { MenuRoute } from '@/navigation/types';
import { type ProfileTile } from './profileSections';

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
      width="100%"
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
        <Text numberOfLines={1} fontSize={14} fontWeight="600" color="$color">
          {tile.label}
        </Text>
        <Text numberOfLines={1} fontSize={11.5} color="$muted">
          {tile.caption}
        </Text>
      </YStack>
    </YStack>
  );
}

/** Which grid tiles the Profile tour walks through. Keyed off the tile, so a
 * reordered grid cannot point a step at the wrong destination. */
const TOUR_ANCHORS: Readonly<Record<string, string>> = {
  'pod-history': 'profile-history',
  earn: 'profile-earn',
};

function TileWithTour({
  tile,
  onNavigate,
}: Readonly<{ tile: ProfileTile; onNavigate: (route: MenuRoute) => void }>) {
  const anchor = TOUR_ANCHORS[tile.key];
  if (!anchor) return <GridTile tile={tile} onNavigate={onNavigate} />;
  return (
    <TourAnchor tour="profile" anchor={anchor} style={{ flexGrow: 1 }}>
      <GridTile tile={tile} onNavigate={onNavigate} />
    </TourAnchor>
  );
}

/**
 * Two-column quick-action grid — RN port of mWeb's <QuickActionGrid/>.
 *
 * The tiles are composed by the caller: two of them (Chats, Following) came
 * down from the bottom bar carrying translated labels, and `profileSections`
 * holds no copy (rule 38).
 */
export function SidebarQuickGrid({
  tiles,
  onNavigate,
}: Readonly<{ tiles: readonly ProfileTile[]; onNavigate: (route: MenuRoute) => void }>) {
  return (
    <XStack
      paddingHorizontal={16}
      paddingBottom={10}
      flexWrap="wrap"
      gap={10}
      justifyContent="space-between"
    >
      {tiles.map((tile) => (
        // The CELL owns the 48%/grow sizing, not the tile, because a tour wraps
        // two of these tiles in an extra View and TourAnchor renders nothing at
        // all when no tour is on — so the sizing has to sit on something that is
        // always there, with grow repeated down the chain to keep the tiles in a
        // row the same height.
        <YStack key={tile.key} width="48%" flexGrow={1}>
          <TileWithTour tile={tile} onNavigate={onNavigate} />
        </YStack>
      ))}
    </XStack>
  );
}
