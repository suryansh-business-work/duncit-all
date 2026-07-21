import { Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { cartLineKey, type CartLine } from '../../components/cart/CartContext';

interface Props {
  podId: string;
  podTitle: string;
  lines: CartLine[];
  priceFormat: (amount: number) => string;
  onSetQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
  onCheckout: () => void;
}

/** One pod's cart lines: per-line +/- and remove, and the group's sticky
 * "Proceed to checkout" (checkout is per pod — products ride its booking). */
export default function CartPodGroup({
  podId,
  podTitle,
  lines,
  priceFormat,
  onSetQuantity,
  onRemove,
  onCheckout,
}: Readonly<Props>) {
  const total = lines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0);
  return (
    <Stack
      spacing={1}
      sx={{ p: 1.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      data-testid={`cart-pod-${podId}`}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
        {podTitle}
      </Typography>
      {lines.map((line) => (
        <Stack key={cartLineKey(line)} direction="row" spacing={1} alignItems="center">
          <Box
            sx={{ width: 48, height: 48, borderRadius: 2, overflow: 'hidden', flex: '0 0 auto', bgcolor: 'action.hover' }}
          >
            {line.image_url && (
              <Box
                component="img"
                src={line.image_url}
                alt={line.product_name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
              {line.product_name}
              {line.variant_label ? ` — ${line.variant_label}` : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {priceFormat(line.unit_cost)} each
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              size="small"
              aria-label={`Decrease ${line.product_name}`}
              onClick={() => onSetQuantity(line, line.quantity - 1)}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" fontWeight={900}>
              {line.quantity}
            </Typography>
            <IconButton
              size="small"
              aria-label={`Increase ${line.product_name}`}
              disabled={line.quantity >= line.max_quantity}
              onClick={() => onSetQuantity(line, Math.min(line.max_quantity, line.quantity + 1))}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          <IconButton
            size="small"
            aria-label={`Remove ${line.product_name}`}
            onClick={() => onRemove(line)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Divider />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Products total
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {priceFormat(total)}
        </Typography>
      </Stack>
      <Button variant="contained" onClick={onCheckout} sx={{ borderRadius: 999, fontWeight: 900 }}>
        Proceed to checkout
      </Button>
    </Stack>
  );
}
