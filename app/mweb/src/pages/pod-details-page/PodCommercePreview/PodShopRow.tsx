import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBagOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import { useCartControlLabels } from '../../../components/cart/useCartControlLabels';
import { useTranslation } from '../../../i18n/useTranslation';
import { rowSx } from './podShopStyles';

/** What a row reads off one of the pod's `product_requests`. */
export interface PodShopItem {
  product_id: string;
  product_name: string;
  unit_cost?: number | null;
  /** Stocked minus sold; older rows carry only `quantity`. */
  available_count?: number | null;
  quantity?: number | null;
  image_url?: string | null;
  images?: string[] | null;
}

interface Props {
  item: PodShopItem;
  /** How many of the base product the cart holds for this pod. */
  quantity: number;
  /** The owner closed the shop: the row is a listing only. */
  readOnly: boolean;
  priceFormat: (amount: number) => string;
  onQuantity: (productId: string, quantity: number) => void;
  onInfo: (productId: string) => void;
}

/** One product of the pod's shop: thumb, name, stock, the cart control under
 * the name, the way into its details and the line's price. The "Item added" /
 * "Item removed" notice lies on the row — the thumb is too small to hold it. */
export default function PodShopRow({ item, quantity, readOnly, priceFormat, onQuantity, onInfo }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCartControlLabels()(item.product_name);
  const notice = useCartControlNotice(quantity);
  const [imageFailed, setImageFailed] = useState(false);
  const maxQuantity = Number(item.available_count ?? item.quantity ?? 0);
  // A closed shop is read-only — no re-selecting. Selected styling stays
  // as the in-cart indicator.
  const selected = !readOnly && quantity > 0;
  const imageUrl = item.image_url || item.images?.[0] || '';
  return (
    <Stack direction="row" spacing={1} data-testid={`pod-shop-row-${item.product_id}`} sx={rowSx(selected)}>
      <CartControlNoticeChip notice={notice} labels={labels} testId={`pod-shop-${item.product_id}-notice`} />
      <Box sx={{ width: 54, height: 54, borderRadius: '12px', overflow: 'hidden', flex: '0 0 auto', bgcolor: 'background.paper', color: 'secondary.main', display: 'grid', placeItems: 'center' }}>
        {imageUrl && !imageFailed ? (
          <Box component="img" src={imageUrl} alt={item.product_name} onError={() => setImageFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ShoppingBagIcon fontSize="small" />
        )}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{item.product_name}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{t('mweb.podDetails.shopAvailable', { vars: { count: maxQuantity } })}</Typography>
        {/* Sold out takes the "+" away, but what is already in the cart can still be taken out. */}
        {!readOnly && (maxQuantity > 0 || quantity > 0) && (
          <Box sx={{ mt: 0.75 }}>
            <CartQuantityControl
              size="small"
              quantity={quantity}
              max={maxQuantity}
              labels={labels}
              onChange={(next) => onQuantity(item.product_id, next)}
              testIdPrefix={`pod-shop-${item.product_id}`}
            />
          </Box>
        )}
      </Box>
      <DuncitIconButton
        size="small"
        aria-label={t('mweb.checkout.viewProduct', { vars: { name: item.product_name } })}
        onClick={() => onInfo(item.product_id)}
        data-testid={`pod-shop-info-${item.product_id}`}
        sx={{ color: 'text.secondary' }}
      >
        <InfoOutlinedIcon fontSize="small" />
      </DuncitIconButton>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        +{priceFormat(Number(item.unit_cost ?? 0) * Math.max(quantity, 1))}
      </Typography>
    </Stack>
  );
}
