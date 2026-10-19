import { useEffect, useState } from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { useAdminLocations } from '@duncit/location';
import { useDebouncedValue } from '@duncit/ui';
import {
  GIG_FILTER_SETTLE_MS,
  clubCityName,
  settledGigFilter,
  type GigCategory,
  type GigJobFilter,
} from '@duncit/utils';

interface Props {
  categories: readonly GigCategory[];
  value: GigJobFilter;
  onChange: (next: GigJobFilter) => void;
}

/**
 * Free-text search, category and city. The search settles before it queries;
 * the city is a pick from the admin Location list (the viewer's selected city
 * until they change it), so "Lu" can no longer miss Lucknow.
 */
export default function GigFilters({ categories, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { locations } = useAdminLocations();
  const [search, setSearch] = useState(value.search ?? '');
  const settled = useDebouncedValue(search, GIG_FILTER_SETTLE_MS);

  useEffect(() => {
    const next = settledGigFilter(value, settled);
    if (next) onChange(next);
  }, [settled, value, onChange]);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField
        label={t('gigJobs.board.search')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        size="small"
        fullWidth
        type="search"
      />
      <TextField
        select
        label={t('gigJobs.board.category')}
        value={value.category_id ?? ''}
        onChange={(event) => onChange({ ...value, category_id: event.target.value || null })}
        size="small"
        fullWidth
      >
        <MenuItem value="">{t('gigJobs.board.allCategories')}</MenuItem>
        {categories.map((category) => (
          <MenuItem key={category.id} value={category.id}>
            {category.title}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={t('gigJobs.board.city')}
        // A city the list no longer offers (switched off since) reads as "All cities".
        value={locations.some((location) => location.id === value.location_id) ? value.location_id : ''}
        onChange={(event) => onChange({ ...value, location_id: event.target.value || null })}
        size="small"
        fullWidth
        data-testid="gig-filter-city"
      >
        <MenuItem value="">{t('gigJobs.board.allCities')}</MenuItem>
        {locations.map((location) => (
          <MenuItem key={location.id} value={location.id}>
            {clubCityName({ id: location.id, city: location.city, location_name: location.location_name ?? '' })}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
