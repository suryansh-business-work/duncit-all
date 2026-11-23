import { Stack, Tooltip, Typography } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The two fields a nearby lead table page adds to every row. */
export interface NearbyRowFields {
  distance_km?: number | null;
  geo_precision?: string | null;
}

const PRECISION_KEYS: Record<string, { short: string; long: string }> = {
  PIN: { short: 'crm.nearby.precisionPinShort', long: 'crm.nearby.precisionPin' },
  AREA: { short: 'crm.nearby.precisionAreaShort', long: 'crm.nearby.precisionArea' },
  CITY: { short: 'crm.nearby.precisionCityShort', long: 'crm.nearby.precisionCity' },
};

/** One decimal under 10 km, whole kilometres beyond. */
export const formatKm = (km: number) => (km < 10 ? km.toFixed(1) : String(Math.round(km)));

/**
 * The Distance column a nearby search adds: kilometres from the search centre
 * (sortable and filterable on the server), and how the lead was placed
 * underneath (with the full wording as a tooltip), since area and city
 * centres are approximate.
 */
export function distanceColumn<T extends NearbyRowFields>(t: Translate): DuncitColumn<T> {
  const text = (row: T) =>
    typeof row.distance_km === 'number' ? t('crm.nearby.distanceValue', { vars: { km: formatKm(row.distance_km) } }) : '—';
  return {
    field: 'distance_km',
    headerName: t('crm.nearby.distance'),
    type: 'number',
    minWidth: 120,
    valueGetter: (row) => row.distance_km ?? null,
    cellRenderer: (row) => {
      const keys = row.geo_precision ? PRECISION_KEYS[row.geo_precision] : undefined;
      return (
        <Tooltip title={keys ? t(keys.long) : ''}>
          <Stack component="span" sx={{ lineHeight: 1.2 }}>
            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
              {text(row)}
            </Typography>
            {keys && (
              <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
                {t(keys.short)}
              </Typography>
            )}
          </Stack>
        </Tooltip>
      );
    },
  };
}
