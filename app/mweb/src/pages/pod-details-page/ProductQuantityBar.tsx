import { IconButton, Stack, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';

interface Props {
  quantity: number;
  maxQuantity: number;
  onUpdate: (quantity: number) => void;
}

/** In-dialog cart control for the product sheet: add the product, adjust its
 * quantity (clamped to available stock), or remove it from the selection. */
export default function ProductQuantityBar({ quantity, maxQuantity, onUpdate }: Readonly<Props>) {
  if (quantity <= 0) {
    const outOfStock = maxQuantity <= 0;
    return (
      <Button
        variant="contained"
        fullWidth
        startIcon={<AddShoppingCartIcon />}
        disabled={outOfStock}
        onClick={() => onUpdate(1)}
      >
        {outOfStock ? 'Out of stock' : 'Add to selection'}
      </Button>
    );
  }
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton aria-label="Decrease quantity" onClick={() => onUpdate(quantity - 1)}>
          <RemoveIcon />
        </IconButton>
        <Typography sx={{ fontWeight: 900, minWidth: 24, textAlign: 'center' }}>{quantity}</Typography>
        <IconButton
          aria-label="Increase quantity"
          disabled={quantity >= maxQuantity}
          onClick={() => onUpdate(Math.min(maxQuantity, quantity + 1))}
        >
          <AddIcon />
        </IconButton>
      </Stack>
      <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onUpdate(0)}>
        Remove
      </Button>
    </Stack>
  );
}
