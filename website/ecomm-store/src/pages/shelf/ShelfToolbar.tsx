import { useId } from 'react';
import { Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { DuncitButton } from '@duncit/buttons';

import type { StoreSearchPage, StoreSort } from '../../graphql/catalog';
import { useMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';
import { flagChips, listChips } from './activeChips';
import { SORTS, type ShelfControls } from './useShelfFilters';

const SORT_KEYS: Record<StoreSort, string> = {
  RELEVANCE: 'ecommStore.sort.relevance',
  NEWEST: 'ecommStore.sort.newest',
  BESTSELLING: 'ecommStore.sort.bestselling',
  PRICE_ASC: 'ecommStore.sort.priceAsc',
  PRICE_DESC: 'ecommStore.sort.priceDesc',
  DISCOUNT: 'ecommStore.sort.discount',
  RATING: 'ecommStore.sort.rating',
};

interface ToolbarProps {
  page: StoreSearchPage | undefined;
  controls: ShelfControls;
  onOpenFilters: () => void;
}

/** Result count, sort, and (on a phone) the button that opens the filter screen. */
export function ShelfToolbar({ page, controls, onOpenFilters }: Readonly<ToolbarProps>) {
  const { t } = useStoreT();
  const labelId = useId();
  const sort = controls.filters.sort ?? page?.sort ?? 'RELEVANCE';
  return (
    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography sx={{ flexGrow: 1, fontWeight: 700 }} aria-live="polite">
        {t('ecommStore.shelf.results', { count: page?.total ?? 0 })}
      </Typography>
      <DuncitButton variant="outlined" startIcon={<TuneRoundedIcon />} onClick={onOpenFilters} sx={{ display: { md: 'none' } }}>
        {t('ecommStore.filters.open')}
      </DuncitButton>
      <FormControl size="small" sx={{ minWidth: 190 }}>
        <InputLabel id={labelId}>{t('ecommStore.sort.label')}</InputLabel>
        <Select
          labelId={labelId}
          label={t('ecommStore.sort.label')}
          value={sort}
          onChange={(event) => controls.setSort(event.target.value)}
        >
          {SORTS.map((option) => (
            <MenuItem key={option} value={option}>
              {t(SORT_KEYS[option])}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}

/** The filters in force, each removable; plus "Clear all". */
export function ActiveFilterChips({ page, controls }: Readonly<Omit<ToolbarProps, 'onOpenFilters'>>) {
  const { t } = useStoreT();
  const money = useMoney();
  const { filters } = controls;
  const price = t('ecommStore.filters.priceRange', {
    vars: { min: money(filters.min ?? page?.price_min ?? 0), max: money(filters.max ?? page?.price_max ?? 0) },
  });
  const chips = [
    ...listChips(page, controls),
    ...flagChips(controls, { price, inStock: t('ecommStore.filters.inStock'), onSale: t('ecommStore.filters.onSale') }),
  ];
  if (chips.length === 0) return null;
  return (
    <Stack direction="row" spacing={1} useFlexGap aria-label={t('ecommStore.filters.active')} component="ul" sx={{ flexWrap: 'wrap', listStyle: 'none', p: 0, m: 0 }}>
      {chips.map((chip) => (
        <Stack component="li" key={chip.key}>
          <Chip label={chip.label} onDelete={chip.remove} aria-label={t('ecommStore.filters.remove', { vars: { name: chip.label } })} />
        </Stack>
      ))}
      <Stack component="li">
        <DuncitButton size="small" onClick={controls.clearAll}>
          {t('ecommStore.filters.clearAll')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
