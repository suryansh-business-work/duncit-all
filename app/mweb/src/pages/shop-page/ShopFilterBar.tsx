import { useState } from 'react';
import { Badge, Box, Checkbox, Chip, Collapse, FormControlLabel, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import { DuncitIconButton } from '@duncit/buttons';
import { SHOP_SORT_OPTIONS, type ShopSort } from './queries';
import { SHOP_RATING_OPTIONS, type ShopFilters } from './useShopFilters';
import { useTranslation } from '../../i18n/useTranslation';

type Option = readonly [string, string];

const railSx = { overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } } as const;

/** A horizontally-scrollable chip row for a single filter dimension. */
function FilterChipRow({
  options,
  value,
  onSelect,
}: Readonly<{ options: readonly Option[]; value: string; onSelect: (v: string) => void }>) {
  return (
    <Box sx={railSx}>
      <Stack direction="row" spacing={1} sx={{ width: 'max-content', pb: 0.25 }}>
        {options.map(([val, label]) => (
          <Chip
            key={val || 'all'}
            label={label}
            clickable
            color={value === val ? 'primary' : 'default'}
            variant={value === val ? 'filled' : 'outlined'}
            onClick={() => onSelect(val)}
            sx={{ height: 32, fontWeight: 600, borderRadius: 999, flex: '0 0 auto' }}
          />
        ))}
      </Stack>
    </Box>
  );
}

/** A labelled filter group. */
function FilterSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        {title.toUpperCase()}
      </Typography>
      {children}
    </Stack>
  );
}

const withAll = (options: Option[]): Option[] => [['', 'All'], ...options];

/** Search field + a filter button that reveals the Super → Category → Sub
 * cascade, rating buckets, an include-out-of-stock toggle and sort. Filters live
 * behind the button (with an active-count badge) to keep the header clean. Twin
 * of the native ShopFilterBar. */
export default function ShopFilterBar({ filters }: Readonly<{ filters: ShopFilters }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <TextField
          size="small"
          placeholder={t('mweb.shop.searchPlaceholder')}
          value={filters.query}
          onChange={(e) => filters.setQuery(e.target.value)}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
        <DuncitIconButton
          aria-label={t('mweb.common.filters')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          sx={{
            bgcolor: open ? 'primary.main' : 'action.hover',
            color: open ? 'primary.contrastText' : 'inherit',
            '&:hover': { bgcolor: open ? 'primary.dark' : 'action.selected' },
          }}
        >
          <Badge badgeContent={filters.activeCount} color="error">
            <FilterListRoundedIcon />
          </Badge>
        </DuncitIconButton>
      </Stack>
      <Collapse in={open}>
        <Stack spacing={1.5} sx={{ pt: 1.5 }}>
          {filters.superOptions.length > 0 && (
            <FilterSection title={t('mweb.common.superCategory')}>
              <FilterChipRow
                options={withAll(filters.superOptions)}
                value={filters.superId}
                onSelect={filters.selectSuper}
              />
            </FilterSection>
          )}
          {filters.categoryOptions.length > 0 && (
            <FilterSection title={t('mweb.common.category')}>
              <FilterChipRow
                options={withAll(filters.categoryOptions)}
                value={filters.categoryId}
                onSelect={filters.selectCategory}
              />
            </FilterSection>
          )}
          {filters.subOptions.length > 0 && (
            <FilterSection title="Sub-category">
              <FilterChipRow
                options={withAll(filters.subOptions)}
                value={filters.subId}
                onSelect={filters.setSubId}
              />
            </FilterSection>
          )}
          <FilterSection title={t('mweb.shop.rating')}>
            <FilterChipRow
              options={SHOP_RATING_OPTIONS}
              value={filters.minRating}
              onSelect={filters.setMinRating}
            />
          </FilterSection>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.includeOutOfStock}
                onChange={(e) => filters.setIncludeOutOfStock(e.target.checked)}
              />
            }
            label={t('mweb.shop.includeOutOfStock')}
          />
          <TextField
            select
            size="small"
            label={t('mweb.common.sort')}
            value={filters.sort}
            onChange={(e) => filters.setSort(e.target.value as ShopSort)}
            sx={{ maxWidth: 220 }}
          >
            {SHOP_SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Collapse>
    </Box>
  );
}
