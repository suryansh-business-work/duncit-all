import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, IconButton, Paper, Stack, Typography } from '@mui/material';
import {
  clampPodProductQty,
  podProductImage,
  podProductLineTotal,
  podProductStock,
  type PodPickerProduct,
} from '@duncit/utils';
import { formatMoney } from './format';
import type { Translate } from './i18n/useTranslation';

interface Props {
  product: PodPickerProduct;
  quantity: number;
  onQuantityChange: (next: number) => void;
  onRemove: () => void;
  disabled?: boolean;
  t: Translate;
}

/** One attached product on Step 4: thumbnail, name, quantity stepper and line
 * total. Its product is already chosen, so the stepper is live here — the
 * selection gate only governs the picker. */
export default function AttachedProductRow({
  product,
  quantity,
  onQuantityChange,
  onRemove,
  disabled,
  t,
}: Readonly<Props>) {
  const image = podProductImage(product);
  const stock = podProductStock(product);
  const step = (delta: number) => onQuantityChange(clampPodProductQty(quantity + delta, product));

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {image ? (
            <Box
              component="img"
              src={image}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageNotSupportedIcon fontSize="small" color="disabled" />
          )}
        </Box>

        <Stack flexGrow={1} minWidth={0}>
          <Typography variant="subtitle2" noWrap>
            {product.product_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {t('podProduct.perUnit', { vars: { cost: formatMoney(product.unit_cost) } })}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            size="small"
            aria-label={t('podProduct.decreaseQty')}
            onClick={() => step(-1)}
            disabled={disabled || quantity <= 1}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 28, textAlign: 'center' }}>
            {quantity}
          </Typography>
          <IconButton
            size="small"
            aria-label={t('podProduct.increaseQty')}
            onClick={() => step(1)}
            disabled={disabled || (stock > 0 && quantity >= stock)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Typography variant="subtitle2" sx={{ minWidth: 88, textAlign: 'right' }}>
          {formatMoney(podProductLineTotal(product, quantity))}
        </Typography>

        <IconButton
          aria-label={t('podProduct.removeProduct')}
          onClick={onRemove}
          color="error"
          disabled={disabled}
        >
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
