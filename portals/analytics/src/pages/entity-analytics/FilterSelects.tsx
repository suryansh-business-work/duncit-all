import { useQuery } from '@apollo/client/react';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { ANALYTICS_CITIES, type AnalyticsCompare } from './queries';

/** Every city's value in the select — '' because a select cannot hold null. */
const ALL = '';

/** What the tiles' changes are measured against. */
export function CompareSelect({
  value,
  onChange,
}: Readonly<{ value: AnalyticsCompare; onChange: (next: AnalyticsCompare) => void }>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      size="small"
      label={t('analytics.page.compare')}
      value={value}
      onChange={(event) => onChange(event.target.value === 'YEAR' ? 'YEAR' : 'PREVIOUS')}
      sx={{ minWidth: 200 }}
      slotProps={{ htmlInput: { 'data-testid': 'analytics-compare' } }}
    >
      <MenuItem value="PREVIOUS">{t('analytics.page.comparePrevious')}</MenuItem>
      <MenuItem value="YEAR">{t('analytics.page.compareYear')}</MenuItem>
    </TextField>
  );
}

/** One city, or all of them — on the pages whose numbers all have a place (Pods, Clubs). */
export function CitySelect({
  value,
  onChange,
}: Readonly<{ value: string | null; onChange: (next: string | null) => void }>) {
  const { t } = useTranslation();
  const { data } = useQuery(ANALYTICS_CITIES);
  return (
    <TextField
      select
      size="small"
      label={t('analytics.page.city')}
      value={value ?? ALL}
      onChange={(event) => onChange(event.target.value || null)}
      sx={{ minWidth: 180 }}
      slotProps={{ htmlInput: { 'data-testid': 'analytics-city' } }}
    >
      <MenuItem value={ALL}>{t('analytics.page.allCities')}</MenuItem>
      {(data?.analyticsCities ?? []).map((city) => (
        <MenuItem key={city.id} value={city.id}>
          {city.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
