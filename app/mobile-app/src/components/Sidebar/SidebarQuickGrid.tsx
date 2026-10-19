import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import type { MenuRoute } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { MenuEntry } from './profileSections';

/** The red count on a tile's corner — "9+" past nine, so it stays a dot. */
function TileBadge({ count }: Readonly<{ count: number }>) {
  return (
    <YStack
      testID="sidebar-grid-badge"
      position="absolute"
      top={8}
      right={8}
      minWidth={20}
      height={20}
      paddingHorizontal={5}
      borderRadius={10}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$danger"
      aria-hidden
    >
      <Text fontSize={11} fontWeight="700" color="$onDanger">
        {count > 9 ? '9+' : count}
      </Text>
    </YStack>
  );
}

/** One square Quick Access tile: an accent icon over its label, and an
 * optional unread count (Chats). */
export function QuickTile({
  tile,
  badgeCount,
  onNavigate,
}: Readonly<{ tile: MenuEntry; badgeCount?: number; onNavigate: (route: MenuRoute) => void }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const unread = badgeCount && badgeCount > 0 ? badgeCount : 0;
  return (
    <YStack
      testID={`sidebar-grid-${tile.key}`}
      role="button"
      aria-label={tile.label}
      // One element on native, so the unread count rides as the hint.
      accessibilityHint={unread ? t('mweb.sidebar.unreadBadge', { vars: { unread } }) : undefined}
      tabIndex={0}
      onPress={() => onNavigate(tile.route)}
      aspectRatio={1}
      alignItems="center"
      justifyContent="center"
      gap={8}
      borderRadius={16}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
      padding={8}
      pressStyle={PRESS_STYLE.surface}
    >
      <MaterialIcons name={tile.icon} size={26} color={accent} />
      <Text numberOfLines={2} textAlign="center" fontSize={12} fontWeight="600" color="$color">
        {tile.label}
      </Text>
      {unread ? <TileBadge count={unread} /> : null}
    </YStack>
  );
}

/** Which tiles the Profile tour walks through. Keyed off the tile, so a
 * reordered or edited grid cannot point a step at the wrong destination. */
const TOUR_ANCHORS: Readonly<Record<string, string>> = {
  'pod-history': 'profile-history',
  earn: 'profile-earn',
};

/**
 * "Quick Access" — the header row with its Edit link, then a 3-column grid of
 * the member's six tiles. RN twin of mWeb's <QuickActionGrid/>.
 */
export function SidebarQuickGrid({
  tiles,
  badgeCounts,
  onEdit,
  onNavigate,
}: Readonly<{
  tiles: readonly MenuEntry[];
  /** Per-tile counts (the Chats unread count); a tile without one shows none. */
  badgeCounts?: Readonly<Partial<Record<MenuEntry['key'], number>>>;
  onEdit: () => void;
  onNavigate: (route: MenuRoute) => void;
}>) {
  const { t } = useTranslation();
  return (
    <YStack paddingHorizontal={16} paddingBottom={16} gap={10}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text role="heading" fontSize={16} fontWeight="700" color="$color">
          {t('mweb.sidebar.quickAccess')}
        </Text>
        <XStack
          testID="sidebar-quick-edit"
          role="button"
          aria-label={t('mweb.sidebar.editQuickAccess')}
          tabIndex={0}
          hitSlop={12}
          onPress={onEdit}
          pressStyle={PRESS_STYLE.ghost}
        >
          <Text fontSize={14} fontWeight="600" color="$accent">
            {t('mweb.sidebar.edit')}
          </Text>
        </XStack>
      </XStack>
      <XStack
        testID="sidebar-quick-grid"
        flexWrap="wrap"
        rowGap={10}
        justifyContent="space-between"
      >
        {tiles.map((tile) => {
          const anchor = TOUR_ANCHORS[tile.key];
          const body = (
            <QuickTile tile={tile} badgeCount={badgeCounts?.[tile.key]} onNavigate={onNavigate} />
          );
          // The CELL owns the width: TourAnchor renders nothing at all when no
          // tour is on, so sizing has to sit on something that is always there.
          return (
            <YStack key={tile.key} width="31.5%">
              {anchor ? (
                <TourAnchor tour="profile" anchor={anchor}>
                  {body}
                </TourAnchor>
              ) : (
                body
              )}
            </YStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
