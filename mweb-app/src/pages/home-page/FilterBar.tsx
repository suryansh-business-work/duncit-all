import { Box, Chip, MenuItem, Stack, TextField } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import type { DateFilter, PriceFilter, SortBy } from './queries';

interface Props {
  categoryChips: any[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  priceFilter: PriceFilter;
  setPriceFilter: (v: PriceFilter) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
}

export default function FilterBar({
  categoryChips,
  categoryId,
  setCategoryId,
  priceFilter,
  setPriceFilter,
  dateFilter,
  setDateFilter,
  sortBy,
  setSortBy,
}: Props) {
  return (
    <Stack spacing={1.5}>
      {categoryChips.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'action.hover', borderRadius: 2 },
          }}
        >
          <Chip
            label="All"
            color={!categoryId ? 'primary' : 'default'}
            variant={!categoryId ? 'filled' : 'outlined'}
            onClick={() => setCategoryId('')}
            sx={{ flexShrink: 0 }}
          />
          {categoryChips.map((c: any) => {
            const selected = categoryId === c.id;
            const isSub = c.level === 'SUB';
            return (
              <Chip
                key={c.id}
                label={isSub ? `# ${c.name}` : c.name}
                size={isSub ? 'small' : 'medium'}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => setCategoryId(selected ? '' : c.id)}
                sx={{
                  flexShrink: 0,
                  ...(isSub && !selected
                    ? { color: 'text.secondary', borderStyle: 'dashed' }
                    : null),
                }}
              />
            );
          })}
        </Box>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
        useFlexGap
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
          {(
            [
              ['ALL', 'All Pods'],
              ['FREE', 'Free'],
              ['PAID', 'Paid'],
              ['PREMIUM', 'Premium'],
            ] as const
          ).map(([val, lbl]) => (
            <Chip
              key={val}
              label={lbl}
              size="small"
              color={priceFilter === val ? 'primary' : 'default'}
              variant={priceFilter === val ? 'filled' : 'outlined'}
              onClick={() => setPriceFilter(val)}
            />
          ))}
          <Box sx={{ width: 8 }} />
          {(
            [
              ['ALL', 'Any time'],
              ['TODAY', 'Today'],
              ['TOMORROW', 'Tomorrow'],
              ['WEEK', 'This Week'],
              ['MONTH', 'This Month'],
            ] as const
          ).map(([val, lbl]) => (
            <Chip
              key={val}
              label={lbl}
              size="small"
              color={dateFilter === val ? 'secondary' : 'default'}
              variant={dateFilter === val ? 'filled' : 'outlined'}
              onClick={() => setDateFilter(val)}
            />
          ))}
        </Stack>
        <TextField
          select
          size="small"
          label="Sort by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <SortIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            ),
          }}
        >
          <MenuItem value="DATE_ASC">Date · Earliest first</MenuItem>
          <MenuItem value="DATE_DESC">Date · Latest first</MenuItem>
          <MenuItem value="PRICE_ASC">Price · Low to High</MenuItem>
          <MenuItem value="PRICE_DESC">Price · High to Low</MenuItem>
        </TextField>
      </Stack>
    </Stack>
  );
}
