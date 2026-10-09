import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTranslation } from '@duncit/shell';
import type { BrandOption } from './queries';

/** The "every brand" choice — the server reads a blank brand_id as all of the caller's brands. */
export const ALL_BRANDS = '';

interface Props {
  brands: readonly BrandOption[];
  value: string;
  onChange: (brandId: string) => void;
  /** Offer "All brands" (a filter) rather than requiring one brand (a selector). */
  allowAll?: boolean;
}

/**
 * Picks one of the partner's brands. Renders nothing for a single-brand
 * partner — there is nothing to choose between.
 */
export default function BrandPicker({ brands, value, onChange, allowAll = false }: Readonly<Props>) {
  const { t } = useTranslation();
  if (brands.length < 2) return null;
  return (
    <TextField
      select
      size="small"
      label={t('partners.brandPicker.label')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      // "All brands" is the blank value — show it rather than an empty box.
      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      sx={{ minWidth: 200 }}
      data-testid="brand-picker"
    >
      {allowAll && <MenuItem value={ALL_BRANDS}>{t('partners.brandPicker.all')}</MenuItem>}
      {brands.map((brand) => (
        <MenuItem key={brand.id} value={brand.id}>
          {brand.brand_name}
        </MenuItem>
      ))}
    </TextField>
  );
}
