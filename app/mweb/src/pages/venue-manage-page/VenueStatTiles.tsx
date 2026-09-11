import { Stack } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';

interface VenueStatTilesProps {
  /** Every venue the partner owns — the one figure that is not per-venue. */
  listed: number;
  capacity: number;
  status: string;
}

/** A count reads big; the status word is kept from truncating — the native
 * StatTile's `lg` / `md`. */
const VALUE_SIZE = { lg: '1.5rem', md: '1.25rem' } as const;

/** Listed / Capacity / Status strip: a muted label over the figure on a
 * surface card. Capacity and Status belong to the venue the switcher has
 * selected; Listed counts them all. Native twin: the StatTile row. */
export default function VenueStatTiles({ listed, capacity, status }: Readonly<VenueStatTilesProps>) {
  const { t } = useTranslation();
  const tiles = [
    { key: 'listed', label: t('mweb.venueManagePage.listed'), value: listed, size: VALUE_SIZE.lg },
    { key: 'capacity', label: t('mweb.common.capacity'), value: capacity || '-', size: VALUE_SIZE.lg },
    { key: 'status', label: t('mweb.venueManagePage.status'), value: status, size: VALUE_SIZE.md },
  ];

  return (
    <Stack direction="row" spacing={1.25}>
      {tiles.map((item) => (
        <StatCard
          key={item.key}
          cardVariant="elevation"
          label={item.label}
          labelVariant="caption"
          labelWeight={600}
          value={item.value}
          valueWeight={700}
          valueNoWrap
          valueSx={{ fontSize: item.size, lineHeight: 1.2 }}
          headerSx={{ mb: 0.5 }}
          sx={{ flex: 1, minWidth: 0 }}
          contentSx={{ p: 2, '&:last-child': { pb: 2 } }}
        />
      ))}
    </Stack>
  );
}
