import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Popover,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/SwapVert';
import {
  POD_HISTORY_SORTS,
  activePodHistoryFilterCount,
  categoriesUnder,
  superCategories,
  type PodHistoryFilters,
} from './podHistoryFilter';
import type { PodHistoryCategory } from './queries';

interface Props {
  filters: PodHistoryFilters;
  categories: PodHistoryCategory[];
  onChange: (next: PodHistoryFilters) => void;
  onReset: () => void;
}

/** Filter (Super → Category) + Sort controls for Pod History, top-right. */
export default function PodHistoryToolbar({ filters, categories, onChange, onReset }: Readonly<Props>) {
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const supers = superCategories(categories);
  const cats = categoriesUnder(categories, filters.superId);
  const count = activePodHistoryFilterCount(filters);

  const selectSuper = (e: SelectChangeEvent) => onChange({ ...filters, superId: e.target.value, categoryId: '' });
  const selectCategory = (e: SelectChangeEvent) => onChange({ ...filters, categoryId: e.target.value });

  return (
    <Stack direction="row" spacing={1} sx={{ flex: '0 0 auto' }}>
      <Button
        size="small"
        variant={count ? 'contained' : 'outlined'}
        color={count ? 'primary' : 'inherit'}
        startIcon={<FilterListIcon />}
        onClick={(e) => setFilterAnchor(e.currentTarget)}
        sx={{ fontWeight: 800, borderRadius: 999 }}
      >
        {count ? `Filter (${count})` : 'Filter'}
      </Button>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        startIcon={<SortIcon />}
        onClick={(e) => setSortAnchor(e.currentTarget)}
        sx={{ fontWeight: 800, borderRadius: 999 }}
      >
        Sort
      </Button>

      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, width: 290 }}>
          <Typography variant="subtitle2" fontWeight={900} gutterBottom>
            Filter by category
          </Typography>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="ph-super-label">Super Category</InputLabel>
            <Select labelId="ph-super-label" label="Super Category" value={filters.superId} onChange={selectSuper}>
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {supers.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mt: 2 }} disabled={!filters.superId}>
            <InputLabel id="ph-cat-label">Category</InputLabel>
            <Select labelId="ph-cat-label" label="Category" value={filters.categoryId} onChange={selectCategory}>
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {cats.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!filters.superId && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
              Please select a Super Category first.
            </Typography>
          )}
          <Divider sx={{ my: 1.5 }} />
          <Button fullWidth size="small" onClick={onReset} disabled={count === 0}>
            Reset
          </Button>
        </Box>
      </Popover>

      <Menu open={Boolean(sortAnchor)} anchorEl={sortAnchor} onClose={() => setSortAnchor(null)}>
        {POD_HISTORY_SORTS.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={opt.value === filters.sort}
            onClick={() => {
              onChange({ ...filters, sort: opt.value });
              setSortAnchor(null);
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
