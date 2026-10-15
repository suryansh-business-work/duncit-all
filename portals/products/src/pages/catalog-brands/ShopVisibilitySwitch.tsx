import { FormControlLabel, Switch, Tooltip } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { CatalogBrandProductRow } from './queries';

interface Props {
  product: CatalogBrandProductRow;
  /** Opens the show/hide confirmation for this product. */
  onToggle: (p: CatalogBrandProductRow) => void;
}

/**
 * Show or hide one brand product in the Pod Shop and pod product picker.
 * Only an approved, unarchived listing can be shown — a pending one goes live
 * through Brands & Products Review, an archived one through Restore.
 */
export default function ShopVisibilitySwitch({ product, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  const shown = product.is_active === true;
  const locked = product.status === 'ARCHIVED' || product.listing_review_status !== 'APPROVED';
  const label = shown ? t('products.brandProducts.shown') : t('products.brandProducts.hidden');

  return (
    <Tooltip describeChild title={locked ? t('products.brandProducts.visibilityLocked') : ''}>
      {/* Stops the row click (which opens the editor) from firing too. */}
      <FormControlLabel
        onClick={(event) => event.stopPropagation()}
        control={
          <Switch
            size="small"
            checked={shown}
            disabled={locked}
            onChange={() => onToggle(product)}
            slotProps={{ input: { 'aria-label': `${label}: ${product.product_name}` } }}
          />
        }
        label={label}
      />
    </Tooltip>
  );
}
