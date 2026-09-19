import { Chip, Tooltip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { StoreProductRow } from '../queries';

/**
 * A product's packaging in the table: "Missing packaging" (with what is
 * missing on hover and to screen readers) or the weight one unit is billed at.
 */
export default function PackagingCell({ row }: Readonly<{ row: StoreProductRow }>) {
  const { t } = useTranslation();
  if (row.packaging_missing.length === 0) {
    return (
      <Typography variant="body2" component="span">
        {t('ecommPortal.shipping.kg', { vars: { value: row.chargeable_weight_kg } })}
      </Typography>
    );
  }
  const missing = row.packaging_missing.join('; ');
  // describeChild keeps the chip's own label as its name; the list is its description.
  return (
    <Tooltip title={missing} describeChild>
      <Chip size="small" color="warning" variant="outlined" label={t('packaging.missing')} data-testid="product-packaging-missing" />
    </Tooltip>
  );
}
