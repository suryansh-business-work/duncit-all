import { useState } from 'react';
import {
  Badge,
  Button,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import SortIcon from '@mui/icons-material/Sort';
import type { SavedCategory } from './queries';
import {
  SAVED_SORTS,
  activeSavedFilterCount,
  categoriesUnder,
  subsUnder,
  superCategories,
  type SavedFilters,
} from './savedItemsFilter';

interface LevelSelectProps {
  label: string;
  value: string;
  options: readonly SavedCategory[];
  disabled?: boolean;
  helper?: string;
  onChange: (id: string) => void;
}

/** One level of the Super → Category → Sub cascade. Hoisted (S6478). */
function LevelSelect({ label, value, options, disabled, helper, onChange }: Readonly<LevelSelectProps>) {
  return (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      helperText={helper}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">All</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

interface Props {
  search: string;
  onSearch: (value: string) => void;
  filters: SavedFilters;
  onFilters: (next: SavedFilters) => void;
  categories: readonly SavedCategory[];
}

/** Saved Items toolbar: debounced search input + a Super→Category→Sub filter
 * popover + a sort menu. All selections drive the server-side query. */
export default function SavedItemsToolbar({ search, onSearch, filters, onFilters, categories }: Readonly<Props>) {
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const filterCount = activeSavedFilterCount(filters);

  const setSuper = (superId: string) => onFilters({ ...filters, superId, categoryId: '', subId: '' });
  const setCategory = (categoryId: string) => onFilters({ ...filters, categoryId, subId: '' });
  const setSub = (subId: string) => onFilters({ ...filters, subId });
  const resetCategory = () => onFilters({ ...filters, superId: '', categoryId: '', subId: '' });

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        size="small"
        fullWidth
        placeholder="Search saved pods…"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        inputProps={{ 'aria-label': 'Search saved pods' }}
      />
      <Badge color="primary" badgeContent={filterCount} overlap="circular">
        <IconButton aria-label="Filter by category" onClick={(event) => setFilterAnchor(event.currentTarget)}>
          <TuneIcon />
        </IconButton>
      </Badge>
      <IconButton aria-label="Sort saved pods" onClick={(event) => setSortAnchor(event.currentTarget)}>
        <SortIcon />
      </IconButton>

      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={2} sx={{ p: 2, width: 288 }}>
          <Typography fontWeight={800}>Filter by category</Typography>
          <LevelSelect label="Super category" value={filters.superId} options={superCategories(categories)} onChange={setSuper} />
          <LevelSelect
            label="Category"
            value={filters.categoryId}
            options={categoriesUnder(categories, filters.superId)}
            disabled={!filters.superId}
            helper={filters.superId ? undefined : 'Select a super category first'}
            onChange={setCategory}
          />
          <LevelSelect
            label="Sub category"
            value={filters.subId}
            options={subsUnder(categories, filters.categoryId)}
            disabled={!filters.categoryId}
            helper={filters.categoryId ? undefined : 'Select a category first'}
            onChange={setSub}
          />
          <Button onClick={resetCategory} disabled={!filterCount}>
            Reset
          </Button>
        </Stack>
      </Popover>

      <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
        {SAVED_SORTS.map((option) => (
          <MenuItem
            key={option.value}
            selected={filters.sort === option.value}
            onClick={() => {
              onFilters({ ...filters, sort: option.value });
              setSortAnchor(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
