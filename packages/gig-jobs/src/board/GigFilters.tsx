import { useEffect, useState } from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { useDebouncedValue } from '@duncit/ui';
import { GIG_FILTER_SETTLE_MS, settledGigFilter, type GigCategory, type GigJobFilter } from '@duncit/utils';

interface Props {
  categories: readonly GigCategory[];
  value: GigJobFilter;
  onChange: (next: GigJobFilter) => void;
}

/** Category, city and free-text search. Typed boxes settle before they query. */
export default function GigFilters({ categories, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState({ search: value.search ?? '', city: value.city ?? '' });
  const settled = useDebouncedValue(typed, GIG_FILTER_SETTLE_MS);

  useEffect(() => {
    const next = settledGigFilter(value, settled.search, settled.city);
    if (next) onChange(next);
  }, [settled, value, onChange]);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <TextField
        label={t('gigJobs.board.search')}
        value={typed.search}
        onChange={(event) => setTyped((now) => ({ ...now, search: event.target.value }))}
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
        label={t('gigJobs.board.city')}
        value={typed.city}
        onChange={(event) => setTyped((now) => ({ ...now, city: event.target.value }))}
        size="small"
        fullWidth
      />
    </Stack>
  );
}
