import { Text, XStack, YStack } from 'tamagui';
import {
  formatMoney,
  venueOwnerStatTiles,
  type VenueOwnerStatKey,
  type VenueOwnerStats,
  type VenueOwnerStatTile,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { StatTile } from './StatTile';

/** Literal keys, one per tile, so the shipped-key gate can see each (rule 38). */
const TILE_LABEL_KEYS: Record<VenueOwnerStatKey, string> = {
  potential_earning: 'mweb.venueManagePage.potentialEarning',
  booked_earning: 'mweb.venueManagePage.bookedEarning',
  upcoming_slots: 'mweb.venueManagePage.upcomingSlots',
  booked_slots: 'mweb.venueManagePage.bookedSlots',
  pending_requests: 'mweb.venueManagePage.pendingRequests',
  total_capacity: 'mweb.venueManagePage.totalCapacity',
};

const tileValue = (tile: VenueOwnerStatTile): string =>
  tile.kind === 'money' ? formatMoney(tile.value) : String(tile.value);

/** Pairs, so the strip reads as three rows of two on a phone. */
function pairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

/**
 * "Slot earnings" — what the venue's calendar could earn, what it will, and
 * the slots behind those figures. Which numbers, in what order and how each
 * is written is `venueOwnerStatTiles` in @duncit/utils, shared with mWeb and
 * the Partners console (rules 27 + 40).
 */
export function VenueSlotEarningsTiles({ stats }: Readonly<{ stats: VenueOwnerStats }>) {
  const { t } = useTranslation();
  const rows = pairs(venueOwnerStatTiles(stats));

  return (
    <YStack gap={10} testID="venue-slot-earnings">
      <Text fontSize={15} fontWeight="700" color="$color">
        {t('mweb.venueManagePage.slotEarnings')}
      </Text>
      {rows.map((row) => (
        <XStack key={row.map((tile) => tile.key).join('+')} gap={10}>
          {row.map((tile) => (
            <StatTile key={tile.key} label={t(TILE_LABEL_KEYS[tile.key])} value={tileValue(tile)} />
          ))}
        </XStack>
      ))}
    </YStack>
  );
}
