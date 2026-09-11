import { useMemo, useState } from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBagOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { alpha, type Theme } from '@mui/material/styles';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import ProductDetailDialog, { type VariantPick } from './ProductDetailDialog';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

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

/** A product row on the card: a soft tile, primary-tinted while it is in the cart. */
const rowSx = (selected: boolean) => (theme: Theme) => ({
  alignItems: 'center',
  p: 1,
  borderRadius: '16px',
  bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : theme.palette.action.hover,
  transition: 'background-color 0.18s ease',
});

/** The pod's own shop: its products as rows on one card, with a running total.
 * Native twin: details/PodShop. */
export default function PodCommercePreview({ pod, priceFormat, selectedProducts, onSelectionChange, selectedTotal, onVariantQuantity }: Readonly<Props>) {
  const { t } = useTranslation();
  const requests = (pod.product_requests ?? []).filter((item: any) => item?.product_name);
  // Add-to-cart works in ANY pod state — the ONLY gate is the owner closing the shop.
  const readOnly = pod.products_enabled === false;
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
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
    <Box sx={{ ...SURFACE_SX, p: 2, overflow: 'hidden' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <SectionHeader title={t('mweb.shop.title')} />
        </Box>
        <Chip size="small" label={pod.products_enabled ? 'Available' : 'Closed'} sx={{ bgcolor: 'action.hover', color: 'text.primary' }} />
      </Stack>

      {requests.length === 0 ? (
        <Stack
          direction="row"
          spacing={1}
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
          {requests.map((item: any) => {
          const maxQuantity = Number(item.available_count ?? item.quantity ?? 0);
          const quantity = selectedProducts[item.product_id] || 0;
          // A closed shop is read-only — no re-selecting. Selected styling stays
          // as the in-cart indicator.
          const selected = !readOnly && quantity > 0;
          const imageUrl = item.image_url || item.images?.[0] || '';
          return (
            <Stack
              key={`${item.product_id}-${item.product_name}`}
              direction="row"
              spacing={1}
              sx={rowSx(selected)}>
              <Box sx={{ width: 54, height: 54, borderRadius: '12px', overflow: 'hidden', flex: '0 0 auto', bgcolor: 'background.paper', color: 'secondary.main', display: 'grid', placeItems: 'center' }}>
                {imageUrl && !imageErrors[item.product_id] ? (
                  <Box component="img" src={imageUrl} alt={item.product_name} onError={() => setImageErrors((prev) => ({ ...prev, [item.product_id]: true }))} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ShoppingBagIcon fontSize="small" />
                )}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{item.product_name}</Typography>
                <Typography variant="caption" sx={{ color: mutedColor }} noWrap>Available {maxQuantity}</Typography>
                {!readOnly && quantity === 0 && maxQuantity > 0 && (
                  <Box sx={{ mt: 0.75 }}>
                    <DuncitButton
                      size="small"
                      variant="contained"
                      startIcon={<AddShoppingCartIcon />}
                      onClick={() => updateQuantity(item.product_id, 1)}
                      sx={{ minHeight: 32 }}
                    >
                      Add to cart
                    </DuncitButton>
                  </Box>
                )}
                {selected && <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{
                    alignItems: "center",
                    mt: 0.75
                  }}>
                  <DuncitIconButton size="small" aria-label={`Decrease ${item.product_name}`} onClick={() => updateQuantity(item.product_id, quantity - 1)}><RemoveIcon fontSize="small" /></DuncitIconButton>
                  <Typography variant="body2" sx={{
                    fontWeight: 700
                  }}>{quantity}</Typography>
                  <DuncitIconButton size="small" aria-label={`Increase ${item.product_name}`} disabled={quantity >= maxQuantity} onClick={() => updateQuantity(item.product_id, Math.min(maxQuantity, quantity + 1))}><AddIcon fontSize="small" /></DuncitIconButton>
                </Stack>}
              </Box>
              <DuncitIconButton
                size="small"
                aria-label={`View ${item.product_name} details`}
                onClick={() => setInfoProductId(item.product_id)}
                sx={{ color: mutedColor }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </DuncitIconButton>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                +{priceFormat(Number(item.unit_cost ?? 0) * Math.max(quantity, 1))}
              </Typography>
            </Stack>
          );
        })}
        </Stack>
      )}

      <Divider sx={{ my: 1.5 }} />
      {readOnly ? (
        <Typography variant="caption" sx={{ color: mutedColor }}>
          The shop is currently closed.
        </Typography>
      ) : (
        <Stack
          direction="row"
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
