import { Box, Card, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { CartQuantityControl } from '@duncit/ui';
import {
  cartLineKey,
  lineQualifiesFreeDelivery,
  type CartLine,
} from '../../components/cart/CartContext';
import FreeDeliveryChip from '../../components/cart/FreeDeliveryChip';
import { useCartControlLabels } from '../../components/cart/useCartControlLabels';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  podId: string;
  podTitle: string;
  lines: CartLine[];
  priceFormat: (amount: number) => string;
  onSetQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
  onMoveToWishlist: (line: CartLine) => void;
}

type LineProps = Omit<Props, 'podId' | 'podTitle' | 'lines'> & { line: CartLine };

const NAME_SX = {
  fontSize: '0.875rem',
  fontWeight: 600,
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

/** One cart line: 64px thumb, name, unit price (+ free-delivery pill), the
 * cart control with "Move to wishlist" beside it, and a round remove button
 * (the whole line in one tap, whatever its quantity). */
function CartLineRow({
  line,
  priceFormat,
  onSetQuantity,
  onRemove,
  onMoveToWishlist,
}: Readonly<LineProps>) {
  const { t } = useTranslation();
  const cartLabels = useCartControlLabels();
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 1.5, alignItems: 'flex-start', '& + &': { borderTop: 1, borderColor: 'divider' } }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '12px', overflow: 'hidden', flex: '0 0 auto', bgcolor: 'action.hover' }}>
        {line.image_url && (
          <Box
            component="img"
            src={line.image_url}
            alt={line.product_name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={NAME_SX}>
          {line.product_name}
          {line.variant_label ? ` — ${line.variant_label}` : ''}
        </Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.cart.unitEach', { vars: { price: priceFormat(line.unit_cost) } })}
          </Typography>
          {lineQualifiesFreeDelivery(line) && <FreeDeliveryChip />}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <CartQuantityControl
            size="small"
            quantity={line.quantity}
            max={line.max_quantity}
            labels={cartLabels(line.product_name)}
            onChange={(next) => onSetQuantity(line, next)}
            testIdPrefix={`cart-line-${cartLineKey(line)}`}
            sx={{ mt: 0.5 }}
          />
          <DuncitButton
            variant="text"
            size="small"
            startIcon={<FavoriteBorderIcon />}
            aria-label={t('mweb.cart.moveToWishlistItem', { vars: { name: line.product_name } })}
            onClick={() => onMoveToWishlist(line)}
            data-testid={`cart-move-wishlist-${cartLineKey(line)}`}
          >
            {t('mweb.cart.moveToWishlist')}
          </DuncitButton>
        </Stack>
      </Stack>
      <DuncitRoundButton
        tone="surface"
        aria-label={t('mweb.cart.removeItem', { vars: { name: line.product_name } })}
        onClick={() => onRemove(line)}
        sx={{ color: 'text.secondary' }}
      >
        <DeleteOutlineIcon />
      </DuncitRoundButton>
    </Stack>
  );
}

/** One pod's cart lines as rows inside one card, plus the group total. The
 * WHOLE cart checks out together — the single CTA lives on the cart page. */
export default function CartPodGroup({
  podId,
  podTitle,
  lines,
  priceFormat,
  onSetQuantity,
  onRemove,
  onMoveToWishlist,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const total = lines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0);
  return (
    <Card sx={{ px: 2, pt: 2, pb: 1.5 }} data-testid={`cart-pod-${podId}`}>
      <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }} noWrap>
        {podTitle}
      </Typography>
      <Box>
        {lines.map((line) => (
          <CartLineRow
            key={cartLineKey(line)}
            line={line}
            priceFormat={priceFormat}
            onSetQuantity={onSetQuantity}
            onRemove={onRemove}
            onMoveToWishlist={onMoveToWishlist}
          />
        ))}
      </Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1.5, borderTop: 1, borderColor: 'divider' }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.cart.productsTotal')}
        </Typography>
        <Typography sx={{ fontWeight: 600 }}>{priceFormat(total)}</Typography>
      </Stack>
    </Card>
  );
}
