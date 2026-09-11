import { Card, CardContent, Stack } from '@mui/material';
import {
  formatMoney,
  venueOwnerStatTiles,
  type VenueOwnerStatKey,
  type VenueOwnerStats,
  type VenueOwnerStatTile,
} from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { FigureTile } from '../../components/studio-pods';
import { useTranslation } from '../../i18n/useTranslation';

/** Money as INR, counts as plain integers — the tile says which it is. */
function tileValue(tile: VenueOwnerStatTile): string {
  if (tile.kind === 'money') return formatMoney(tile.value);
  return String(tile.value);
}

/**
 * "Slot earnings" — the six `venueOwnerStats` figures for the selected venue,
 * in the order and formatting the shared helper decides, so this strip reads
 * the same as the Partners dashboard and the native screen (rules 27 + 40).
 */
export default function VenueOwnerStatsStrip({ stats }: Readonly<{ stats: VenueOwnerStats }>) {
  const { t } = useTranslation();
  // Written out as literals so the shipped-key gate sees each one (rule 38).
  const labels: Record<VenueOwnerStatKey, string> = {
    potential_earning: t('mweb.venueManagePage.potentialEarning'),
    booked_earning: t('mweb.venueManagePage.bookedEarning'),
    upcoming_slots: t('mweb.venueManagePage.upcomingSlots'),
    booked_slots: t('mweb.venueManagePage.bookedSlots'),
    pending_requests: t('mweb.venueManagePage.pendingRequests'),
    total_capacity: t('mweb.venueManagePage.totalCapacity'),
  };

  return (
    <Stack spacing={1.5}>
      <SectionHeader title={t('mweb.venueManagePage.slotEarnings')} />
      <Card>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {venueOwnerStatTiles(stats).map((tile) => (
              <FigureTile key={tile.key} label={labels[tile.key]} value={tileValue(tile)} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
