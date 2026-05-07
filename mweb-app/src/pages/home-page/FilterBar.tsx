import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
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

const scrollRow = {
  display: 'flex',
  gap: 0.75,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;

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
    <Stack spacing={1}>
      {/* ── Category row ── */}
      {categoryChips.length > 0 && (
        <Box sx={scrollRow}>
          <Chip
            label="All"
            size="small"
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
                size="small"
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

      {/* ── Price row ── */}
      <Stack spacing={0.35}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.25, fontWeight: 700, lineHeight: 1.1, textTransform: 'uppercase' }}>
          Price
        </Typography>
        <Box sx={scrollRow}>
          {(
            [
              ['ALL', 'All'],
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
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>
      </Stack>

      {/* ── Date row ── */}
      <Stack spacing={0.35}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.25, fontWeight: 700, lineHeight: 1.1, textTransform: 'uppercase' }}>
          When
        </Typography>
        <Box sx={scrollRow}>
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
              sx={{ flexShrink: 0 }}
            />
          ))}
        </Box>
      </Stack>

      {/* ── Sort row ── */}
      <TextField
        select
        size="small"
        label="Sort by"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortBy)}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
  );
}
