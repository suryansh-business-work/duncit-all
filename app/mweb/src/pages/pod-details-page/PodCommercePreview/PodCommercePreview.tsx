import { useMemo, useState } from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import ProductDetailDialog, { type VariantPick } from '../ProductDetailDialog';
import SectionHeader from '../../../components/SectionHeader';
import { SURFACE_SX } from '../../../theme';
import { useTranslation } from '../../../i18n/useTranslation';
import PodShopRow from './PodShopRow';

interface Props {
  pod: any;
  priceFormat: (amount: number) => string;
  selectedProducts: Record<string, number>;
  onSelectionChange: (next: Record<string, number>) => void;
  /** Variant-aware total for this pod's selection (base + variant lines). */
  selectedTotal?: number;
  /** A variant line change from the detail dialog (row + picked variant + qty). */
  onVariantQuantity?: (row: any, variant: VariantPick, quantity: number) => void;
}

/** Footer label: a count of selected products, or a neutral total caption. */
function productCountLabel(count: number): string {
  if (count === 0) return 'Selected product total';
  return `${count} product${count === 1 ? '' : 's'} selected`;
}

/** The pod's own shop: its products as rows on one card, with a running total.
 * Native twin: details/PodShop. */
export default function PodCommercePreview({ pod, priceFormat, selectedProducts, onSelectionChange, selectedTotal, onVariantQuantity }: Readonly<Props>) {
  const { t } = useTranslation();
  const requests = (pod.product_requests ?? []).filter((item: any) => item?.product_name);
  // Add-to-cart works in ANY pod state — the ONLY gate is the owner closing the shop.
  const readOnly = pod.products_enabled === false;
  const [infoProductId, setInfoProductId] = useState<string | null>(null);

  const baseTotal = useMemo(
    () => requests.reduce((sum: number, item: any) => sum + (selectedProducts[item.product_id] || 0) * Number(item.unit_cost || 0), 0),
    [requests, selectedProducts]
  );
  // The variant-aware total from the cart wins when provided.
  const shownTotal = selectedTotal ?? baseTotal;
  const selectedCount = Object.values(selectedProducts).filter((quantity) => quantity > 0).length;
  const mutedColor = 'text.secondary';
  const updateQuantity = (productId: string, quantity: number) => {
    const next = { ...selectedProducts };
    if (quantity <= 0) delete next[productId];
    else next[productId] = quantity;
    onSelectionChange(next);
  };

  const infoProduct = requests.find((item: any) => item.product_id === infoProductId);
  const infoMax = Number(infoProduct?.available_count ?? infoProduct?.quantity ?? 0);
  const updateInfoLine = (quantity: number, variant: VariantPick | null) => {
    if (!infoProductId) return;
    if (variant && onVariantQuantity && infoProduct) {
      onVariantQuantity(infoProduct, variant, quantity);
      return;
    }
    updateQuantity(infoProductId, quantity);
  };

  return (
    <Box data-testid="pod-shop" sx={{ ...SURFACE_SX, p: 2, overflow: 'hidden' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <SectionHeader testId="pod-shop-header" title={t('mweb.shop.title')} />
        </Box>
        <Chip size="small" label={pod.products_enabled ? 'Available' : 'Closed'} sx={{ bgcolor: 'action.hover', color: 'text.primary' }} />
      </Stack>

      {requests.length === 0 ? (
        <Stack
          direction="row"
          spacing={1}
          data-testid="pod-shop-empty"
          sx={{
            alignItems: "center",
            mt: 2
          }}>
          <Typography variant="body2" sx={{ color: mutedColor }}>
            No products available yet.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={0.9} sx={{ mt: 2 }}>
          {requests.map((item: any) => (
            <PodShopRow
              key={`${item.product_id}-${item.product_name}`}
              item={item}
              quantity={selectedProducts[item.product_id] || 0}
              readOnly={readOnly}
              priceFormat={priceFormat}
              onQuantity={updateQuantity}
              onInfo={setInfoProductId}
            />
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 1.5 }} />
      {readOnly ? (
        <Typography variant="caption" data-testid="pod-shop-closed-note" sx={{ color: mutedColor }}>
          The shop is currently closed.
        </Typography>
      ) : (
        <Stack
          direction="row"
          data-testid="pod-shop-total"
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Typography variant="caption" sx={{ color: mutedColor }}>
            {productCountLabel(selectedCount)}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {priceFormat(shownTotal)}
          </Typography>
        </Stack>
      )}

      <ProductDetailDialog
        productId={infoProductId}
        onClose={() => setInfoProductId(null)}
        selection={selectedProducts}
        maxQuantity={infoMax}
        viewOnly={readOnly}
        onUpdateLine={updateInfoLine}
      />
    </Box>
  );
}
