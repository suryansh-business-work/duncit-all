import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { lineQualifiesFreeDelivery, type CartLine } from '../../../components/cart/CartContext';
import FreeDeliveryChip from '../../../components/cart/FreeDeliveryChip';
import { useTranslation } from '../../../i18n/useTranslation';

/** The line's product photo as a tappable thumbnail that opens the product
 * details; falls back to a shopping-bag placeholder when the line has no image. */
function LineThumb({
  line,
  onInfo,
}: Readonly<{ line: CartLine; onInfo: (productId: string) => void }>) {
  const { t } = useTranslation();
  return (
    <ButtonBase
      data-testid={`product-order-summary-card-thumb-${line.product_id}`}
      aria-label={t('mweb.checkout.viewProduct', { vars: { name: line.product_name } })}
      onClick={() => onInfo(line.product_id)}
      sx={{
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: '12px',
        overflow: 'hidden',
        bgcolor: 'action.hover',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {line.image_url ? (
        <Box
          component="img"
          src={line.image_url}
          alt={line.product_name}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <ShoppingBagOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      )}
    </ButtonBase>
  );
}

/** One product line: a tappable product photo that opens the product details,
 * the label + qty, a "Free delivery" badge when the line meets its product's
 * threshold, and the line total. No pod title — products and pods are separate. */
export default function LineRow({
  line,
  fmt,
  onInfo,
}: Readonly<{ line: CartLine; fmt: (value: number) => string; onInfo: (productId: string) => void }>) {
  const variant = line.variant_label ? ` — ${line.variant_label}` : '';
  const label = `${line.product_name}${variant} × ${line.quantity}`;
  return (
    <Stack
      data-testid={`product-order-summary-card-line-${line.product_id}`}
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'center' }}
    >
      <LineThumb line={line} onInfo={onInfo} />
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, maxWidth: '100%' }}>
          {label}
        </Typography>
        {lineQualifiesFreeDelivery(line) && <FreeDeliveryChip />}
      </Stack>
      <Typography
        data-testid={`product-order-summary-card-line-total-${line.product_id}`}
        variant="body2"
        sx={{ fontWeight: 600 }}
      >
        {fmt(line.unit_cost * line.quantity)}
      </Typography>
    </Stack>
  );
}
