import { useMemo, useState } from 'react';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { podProductRequestsTotal, type PodPickerProduct } from '@duncit/utils';
import AttachedProductRow from './AttachedProductRow';
import PodProductDialog from './PodProductDialog';
import { formatMoney } from './format';
import { useTranslation } from './i18n/useTranslation';

export interface PodProductRequestValue {
  product_id: string;
  quantity: number;
}

interface Props {
  value: PodProductRequestValue[];
  onChange: (next: PodProductRequestValue[]) => void;
  /** Already narrowed to the pod's Super → Category → Sub by the caller. */
  products: readonly PodPickerProduct[];
  error?: string;
  disabled?: boolean;
}

/**
 * Step 4's whole products block: what is attached, and the one door to attaching
 * more.
 *
 * There is no "Attach products to this pod" switch any more — attaching IS
 * adding a product, so the button is the only control and `products_enabled`
 * follows from whether the list is empty. That removes the state this form used
 * to allow (switch on, nothing chosen) which is what let an incomplete product
 * association reach the server.
 *
 * mWeb and the two portals render this identically; the native app ships its
 * Tamagui twin over the same @duncit/utils derivations (rules 27 + 40).
 */
export default function PodProductsField({
  value,
  onChange,
  products,
  error,
  disabled,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const byId = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products]
  );
  const addedIds = useMemo(() => value.map((row) => row.product_id), [value]);
  const total = podProductRequestsTotal(value, products);

  const add = (productId: string, quantity: number) =>
    onChange([...value, { product_id: productId, quantity }]);
  const setQuantity = (index: number, quantity: number) =>
    onChange(value.map((row, i) => (i === index ? { ...row, quantity } : row)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{t('podProduct.attachedTitle')}</Typography>

      {value.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('podProduct.attachedEmpty')}
        </Typography>
      )}

      {value.map((row, index) => {
        const product = byId.get(String(row.product_id));
        // A row whose product has left the catalogue (category changed, listing
        // pulled) still has to be removable, so it renders as a plain warning
        // rather than vanishing — pruneProductRequests drops it on the next
        // cascade, but until then the host can see and clear it.
        if (!product) return null;
        return (
          <AttachedProductRow
            key={row.product_id}
            product={product}
            quantity={row.quantity}
            onQuantityChange={(quantity) => setQuantity(index, quantity)}
            onRemove={() => remove(index)}
            disabled={disabled}
            t={t}
          />
        );
      })}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<AddShoppingCartIcon />}
          onClick={() => setOpen(true)}
          disabled={disabled || products.length === 0}
        >
          {t('podProduct.addButton')}
        </Button>
        {value.length > 0 && (
          <Typography variant="subtitle2">
            {t('podProduct.productTotal', { vars: { amount: formatMoney(total) } })}
          </Typography>
        )}
      </Stack>

      {/* The catalogue arrives already filtered to the pod's club category, so
          empty means "none in this category", not "none at all". */}
      {products.length === 0 && <Alert severity="info">{t('podProduct.emptyCategory')}</Alert>}

      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}

      <PodProductDialog
        open={open}
        onClose={() => setOpen(false)}
        products={products}
        addedIds={addedIds}
        onAdd={add}
      />
    </Stack>
  );
}
