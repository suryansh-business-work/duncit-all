import SearchIcon from '@mui/icons-material/Search';
import { Checkbox, Chip, FormControlLabel, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  POD_PRODUCT_SORTS,
  podProductActiveFilterCount,
  type PodProductCriteria,
  type PodProductSort,
} from '@duncit/utils';
import type { Translate } from './i18n/useTranslation';

interface Props {
  criteria: PodProductCriteria;
  onChange: (next: PodProductCriteria) => void;
  onClear: () => void;
  brands: string[];
  t: Translate;
}

/** Search + brand + stock + sort for the picker. The category cascade is NOT
 * here on purpose: the catalogue handed to the dialog is already narrowed to the
 * pod's Super → Category → Sub, and offering a category filter over a
 * single-category list only ever produces an empty result. */
export default function ProductFilterBar({
  criteria,
  onChange,
  onClear,
  brands,
  t,
}: Readonly<Props>) {
  const activeCount = podProductActiveFilterCount(criteria);
  const patch = (next: Partial<PodProductCriteria>) => onChange({ ...criteria, ...next });

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField
          label={t('podProduct.searchPlaceholder')}
          value={criteria.search}
          onChange={(event) => patch({ search: event.target.value })}
          fullWidth
          size="small"
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
        {brands.length > 0 && (
          <TextField
            select
            label={t('podProduct.brand')}
            value={criteria.brand}
            onChange={(event) => patch({ brand: event.target.value })}
            size="small"
            sx={{ minWidth: { md: 200 } }}
          >
            <MenuItem value="">{t('podProduct.allBrands')}</MenuItem>
            {brands.map((brand) => (
              <MenuItem key={brand} value={brand}>
                {brand}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          label={t('podProduct.sort')}
          value={criteria.sort}
          onChange={(event) => patch({ sort: event.target.value as PodProductSort })}
          size="small"
          sx={{ minWidth: { md: 200 } }}
        >
          {POD_PRODUCT_SORTS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1
        }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={criteria.inStockOnly}
              onChange={(event) => patch({ inStockOnly: event.target.checked })}
            />
          }
          label={t('podProduct.inStockOnly')}
        />
        {activeCount > 0 && (
          <>
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={t('podProduct.activeFilters', { vars: { count: activeCount } })}
            />
            <DuncitButton size="small" onClick={onClear}>
              {t('podProduct.clearFilters')}
            </DuncitButton>
          </>
        )}
      </Stack>
    </Stack>
  );
}
