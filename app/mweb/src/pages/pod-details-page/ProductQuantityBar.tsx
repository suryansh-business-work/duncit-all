import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  quantity: number;
  maxQuantity: number;
  onUpdate: (quantity: number) => void;
}

/** In-dialog cart control for the product sheet: add the product, adjust its
 * quantity (clamped to available stock), or remove it from the selection. */
export default function ProductQuantityBar({ quantity, maxQuantity, onUpdate }: Readonly<Props>) {
  const { t } = useTranslation();
  if (quantity <= 0) {
    const outOfStock = maxQuantity <= 0;
    return (
      <DuncitButton
        variant="contained"
        fullWidth
        startIcon={<AddShoppingCartIcon />}
        disabled={outOfStock}
        onClick={() => onUpdate(1)}
      >
        {outOfStock ? 'Out of stock' : 'Add to selection'}
      </DuncitButton>
    );
  }
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        width: '100%'
      }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <DuncitIconButton aria-label={t('mweb.podDetails.decreaseQuantity')} onClick={() => onUpdate(quantity - 1)}>
          <RemoveIcon />
        </DuncitIconButton>
        <Typography sx={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{quantity}</Typography>
        <DuncitIconButton
          aria-label={t('mweb.podDetails.increaseQuantity')}
          disabled={quantity >= maxQuantity}
          onClick={() => onUpdate(Math.min(maxQuantity, quantity + 1))}
        >
          <AddIcon />
        </DuncitIconButton>
      </Stack>
      <DuncitButton color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onUpdate(0)}>
        Remove
      </DuncitButton>
    </Stack>
  );
}
