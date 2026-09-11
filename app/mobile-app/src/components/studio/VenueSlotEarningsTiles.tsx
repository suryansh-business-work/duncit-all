import { XStack } from 'tamagui';
import {
  formatMoney,
  venueOwnerStatTiles,
  type VenueOwnerStatKey,
  type VenueOwnerStats,
  type VenueOwnerStatTile,
} from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { FigureTile } from './StudioPodFigures';

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

/**
 * "Slot earnings" — what the venue's calendar could earn, what it will, and
 * the slots behind those figures, as soft tiles in one card. Which numbers, in
 * what order and how each is written is `venueOwnerStatTiles` in @duncit/utils,
 * shared with mWeb and the Partners console (rules 27 + 40).
 */
export function VenueSlotEarningsTiles({ stats }: Readonly<{ stats: VenueOwnerStats }>) {
  const { t } = useTranslation();

  return (
    <SurfaceCard gap={12} testID="venue-slot-earnings">
      <SectionHeader title={t('mweb.venueManagePage.slotEarnings')} />
      <XStack flexWrap="wrap" gap={8}>
        {venueOwnerStatTiles(stats).map((tile) => (
          <FigureTile
            key={tile.key}
            testID={`venue-slot-earnings-${tile.key}`}
            label={t(TILE_LABEL_KEYS[tile.key])}
            value={tileValue(tile)}
          />
        ))}
      </XStack>
    </SurfaceCard>
  );
}
