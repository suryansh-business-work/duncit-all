import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { ANALYTICS_PAGES } from '../../entity-analytics/pages';
import type { AnalyticsEntity } from '../../entity-analytics/queries';
import type { DashboardTile } from './useDashboardTiles';
import type { AlertValues } from './analytics-alert.types';

interface Props {
  control: Control<AlertValues>;
  setValue: UseFormSetValue<AlertValues>;
  tiles: readonly DashboardTile[];
  tilesLoading: boolean;
}

/** Which number the alert watches: a dashboard, then one of its tiles. */
export default function TileFields({ control, setValue, tiles, tilesLoading }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Controller
        name="entity"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            fullWidth
            label={t('analytics.alerts.dashboard')}
            helperText={t('analytics.alerts.dashboardHint')}
            onChange={(event) => {
              field.onChange(event.target.value as AnalyticsEntity);
              // Another dashboard has other tiles; the old choice would name none of them.
              setValue('kpi_key', '', { shouldValidate: false });
            }}
            slotProps={{ htmlInput: { 'data-testid': 'analytics-alert-dashboard' } }}
          >
            {ANALYTICS_PAGES.map((page) => (
              <MenuItem key={page.entity} value={page.entity}>
                {t(page.title)}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name="kpi_key"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            select
            fullWidth
            required
            disabled={tilesLoading && tiles.length === 0}
            label={t('analytics.alerts.tile')}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? (tilesLoading ? t('analytics.alerts.tilesLoading') : t('analytics.alerts.tileHint'))}
            slotProps={{ htmlInput: { 'data-testid': 'analytics-alert-tile' } }}
          >
            {tiles.map((tile) => (
              <MenuItem key={tile.key} value={tile.key}>
                {tile.title}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Stack>
  );
}
