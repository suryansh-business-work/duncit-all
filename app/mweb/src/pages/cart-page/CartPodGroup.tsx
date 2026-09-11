import { Box, Card, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitRoundButton } from '@duncit/buttons';
import {
  cartLineKey,
  lineQualifiesFreeDelivery,
  type CartLine,
} from '../../components/cart/CartContext';
import FreeDeliveryChip from '../../components/cart/FreeDeliveryChip';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  podId: string;
  podTitle: string;
  lines: CartLine[];
  priceFormat: (amount: number) => string;
  onSetQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
}

interface LineProps {
  line: CartLine;
  priceFormat: (amount: number) => string;
  onSetQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
}

const NAME_SX = {
  fontSize: '0.875rem',
  fontWeight: 600,
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

const STEP_SX = { width: 32, height: 32, minWidth: 32, minHeight: 32, bgcolor: 'background.paper', color: 'text.primary' } as const;

/** The per-line − qty + stepper: a soft pill holding two round buttons. */
function QtyStepper({ line, onSetQuantity }: Readonly<Pick<LineProps, 'line' | 'onSetQuantity'>>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', alignSelf: 'flex-start', p: 0.5, mt: 0.5, borderRadius: 999, bgcolor: 'action.hover' }}
    >
      <DuncitRoundButton
        sx={STEP_SX}
        aria-label={t('mweb.cart.decrease', { vars: { name: line.product_name } })}
        onClick={() => onSetQuantity(line, line.quantity - 1)}
      >
        <RemoveIcon />
      </DuncitRoundButton>
      <Typography sx={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{line.quantity}</Typography>
      <DuncitRoundButton
        sx={STEP_SX}
        aria-label={t('mweb.cart.increase', { vars: { name: line.product_name } })}
        disabled={line.quantity >= line.max_quantity}
        onClick={() => onSetQuantity(line, Math.min(line.max_quantity, line.quantity + 1))}
      >
        <AddIcon />
      </DuncitRoundButton>
    </Stack>
  );
}

/** One cart line: 64px thumb, name, unit price (+ free-delivery pill), the
 * stepper, and a round remove button. */
function CartLineRow({ line, priceFormat, onSetQuantity, onRemove }: Readonly<LineProps>) {
  const { t } = useTranslation();
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
        <QtyStepper line={line} onSetQuantity={onSetQuantity} />
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
