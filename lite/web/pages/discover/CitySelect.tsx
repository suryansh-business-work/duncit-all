import { MenuItem, TextField } from '@mui/material';
import type { LiteCity } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';

interface CitySelectProps {
  cities: readonly LiteCity[];
  value: string;
  onChange: (slug: string) => void;
}

/** Narrow Discover to one city; blank means everywhere. */
export function CitySelect({ cities, value, onChange }: Readonly<CitySelectProps>) {
  const { t } = useWebT();
  const known = cities.some((city) => city.slug === value) ? value : '';
  return (
    <TextField
      select
      size="small"
      label={t('liteWeb.discover.cityLabel')}
      value={known}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 200 }}
      slotProps={{ select: { SelectDisplayProps: { 'data-testid': 'city-select' } as Record<string, string> } }}
    >
      <MenuItem value="">{t('liteWeb.discover.allCities')}</MenuItem>
      {cities.map((city) => (
        <MenuItem key={city.id} value={city.slug}>
          {city.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
