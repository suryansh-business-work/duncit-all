import { useState } from 'react';
import {
  Badge,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/TuneRounded';
import SortIcon from '@mui/icons-material/SwapVertRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import SearchPillField from '../pod-list/SearchPillField';
import type { SavedCategory } from './queries';
import {
  SAVED_SORTS,
  activeSavedFilterCount,
  categoriesUnder,
  subsUnder,
  superCategories,
  type SavedFilters,
} from './savedItemsFilter';
import { useTranslation } from '../../i18n/useTranslation';

/** The round green filter beside the search pill, and a round surface sort —
 * both the pill's height. Min-height pins them against the coarse-pointer rule. */
const FILTER_BTN_SX = {
  width: 48,
  height: 48,
  minHeight: 48,
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  '&:hover': { bgcolor: 'primary.dark' },
} as const;
const SORT_BTN_SX = {
  width: 48,
  height: 48,
  minHeight: 48,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
  '&:hover': { bgcolor: 'background.paper' },
} as const;

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
  const { t } = useTranslation();
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const filterCount = activeSavedFilterCount(filters);

  const setSuper = (superId: string) => onFilters({ ...filters, superId, categoryId: '', subId: '' });
  const setCategory = (categoryId: string) => onFilters({ ...filters, categoryId, subId: '' });
  const setSub = (subId: string) => onFilters({ ...filters, subId });
  const resetCategory = () => onFilters({ ...filters, superId: '', categoryId: '', subId: '' });

  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <SearchPillField
        placeholder={t('mweb.common.searchSavedPods')}
        value={search}
        onChange={onSearch}
        ariaLabel="Search saved pods"
      />
      <Badge color="secondary" badgeContent={filterCount} overlap="circular">
        <DuncitIconButton
          aria-label={t('mweb.savedItems.filterByCategory')}
          onClick={(event) => setFilterAnchor(event.currentTarget)}
          sx={FILTER_BTN_SX}
        >
          <TuneIcon />
        </DuncitIconButton>
      </Badge>
      <DuncitIconButton
        aria-label={t('mweb.savedItems.sortSavedPods')}
        onClick={(event) => setSortAnchor(event.currentTarget)}
        sx={SORT_BTN_SX}
      >
        <SortIcon />
      </DuncitIconButton>

      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={2} sx={{ p: 2, width: 288 }}>
          <Typography sx={{
            fontWeight: 600
          }}>{t('mweb.savedItems.filterByCategory')}</Typography>
          <LevelSelect label={t('mweb.common.superCategory')} value={filters.superId} options={superCategories(categories)} onChange={setSuper} />
          <LevelSelect
            label={t('mweb.common.category')}
            value={filters.categoryId}
            options={categoriesUnder(categories, filters.superId)}
            disabled={!filters.superId}
            helper={filters.superId ? undefined : 'Select a super category first'}
            onChange={setCategory}
          />
          <LevelSelect
            label={t('mweb.savedItems.subCategory')}
            value={filters.subId}
            options={subsUnder(categories, filters.categoryId)}
            disabled={!filters.categoryId}
            helper={filters.categoryId ? undefined : 'Select a category first'}
            onChange={setSub}
          />
          <DuncitButton onClick={resetCategory} disabled={!filterCount}>
            Reset
          </DuncitButton>
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
