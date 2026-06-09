import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import type { ExploreDateFilter, ExploreFilters, ExplorePreset, ExplorePriceFilter, ExploreSort } from './exploreFilters';

interface ExploreFilterSheetProps {
  open: boolean;
  filters: ExploreFilters;
  setFilters: (filters: ExploreFilters) => void;
  categories: any[];
  activeCount: number;
  resultCount: number;
  onClose: () => void;
}

const PRESETS: Array<[ExplorePreset, string]> = [['ALL', 'All'], ['TONIGHT', 'Tonight'], ['TRENDING', 'Trending'], ['NEAR', 'Near me']];
const SORTS: Array<[ExploreSort, string]> = [['SOONEST', 'Soonest'], ['TRENDING', 'Trending'], ['PRICE_LOW', 'Price low'], ['PRICE_HIGH', 'Price high']];
const PRICES: Array<[ExplorePriceFilter, string]> = [['ALL', 'All'], ['FREE', 'Free'], ['PAID', 'Paid'], ['PREMIUM', 'Premium']];
const DATES: Array<[ExploreDateFilter, string]> = [['ALL', 'Any time'], ['TODAY', 'Today'], ['TOMORROW', 'Tomorrow'], ['WEEK', 'This week'], ['MONTH', 'This month']];

function ChipRow<T extends string>({ items, value, onChange }: Readonly<{ items: Array<[T, string]>; value: T; onChange: (value: T) => void }>) {
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {items.map(([itemValue, label]) => {
        const selected = value === itemValue;
        return (
          <Chip
            key={itemValue}
            label={label}
            clickable
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            onClick={() => onChange(itemValue)}
            sx={{ height: 32, fontWeight: 800 }}
          />
        );
      })}
    </Stack>
  );
}

export default function ExploreFilterSheet({ open, filters, setFilters, categories, activeCount, resultCount, onClose }: Readonly<ExploreFilterSheetProps>) {
  const reset = () => setFilters({ preset: 'ALL', categoryId: '', price: 'ALL', date: 'ALL', sort: 'SOONEST', search: '' });

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
            Filters
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {activeCount} active - {resultCount} pods match
          </Typography>
        </Box>
      }
      sheetMaxHeight="88dvh"
      actions={
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <Button startIcon={<CloseIcon />} onClick={reset} color="inherit" disabled={activeCount === 0}>
            Reset
          </Button>
          <Button variant="contained" onClick={onClose} sx={{ flex: 1, borderRadius: 999, fontWeight: 900 }}>
            Show {resultCount} pods
          </Button>
        </Stack>
      }
      paperSx={{ bgcolor: 'background.default' }}
    >
      <Stack spacing={2}>
        <Stack spacing={0.8}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>Quick presets</Typography>
          <ChipRow items={PRESETS} value={filters.preset} onChange={(preset) => setFilters({ ...filters, preset })} />
        </Stack>
        <Stack spacing={0.8}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>Sort by</Typography>
          <ChipRow items={SORTS} value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} />
        </Stack>
        <Stack spacing={0.8}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>Vibe</Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip label="All" clickable color={!filters.categoryId ? 'primary' : 'default'} variant={!filters.categoryId ? 'filled' : 'outlined'} onClick={() => setFilters({ ...filters, categoryId: '' })} sx={{ height: 32, fontWeight: 800 }} />
            {categories.slice(0, 18).map((category) => {
              const selected = filters.categoryId === category.id;
              return <Chip key={category.id} label={category.name} clickable color={selected ? 'primary' : 'default'} variant={selected ? 'filled' : 'outlined'} onClick={() => setFilters({ ...filters, categoryId: selected ? '' : category.id })} sx={{ height: 32, fontWeight: 800 }} />;
            })}
          </Stack>
        </Stack>
        <Stack spacing={0.8}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>Price</Typography>
          <ChipRow items={PRICES} value={filters.price} onChange={(price) => setFilters({ ...filters, price })} />
        </Stack>
        <Stack spacing={0.8}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>When</Typography>
          <ChipRow items={DATES} value={filters.date} onChange={(date) => setFilters({ ...filters, date })} />
        </Stack>
      </Stack>
    </ResponsiveDialog>
  );
}