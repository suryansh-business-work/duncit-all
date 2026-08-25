import AddIcon from '@mui/icons-material/Add';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  clampPodProductQty,
  podProductImage,
  podProductLineTotal,
  podProductStock,
  type PodPickerProduct,
} from '@duncit/utils';
import { formatMoney } from './format';
import InfoLine from './InfoLine';
import type { Translate } from './i18n/useTranslation';

interface Props {
  product: PodPickerProduct | null;
  quantity: number;
  onQuantityChange: (next: number) => void;
  onAdd: () => void;
  /** Set when the host pressed Add with nothing picked. */
  error: string;
  t: Translate;
}

/**
 * The picker's right-hand rail: what is picked, its details, and the quantity.
 *
 * Nothing is picked → the quantity stepper and Add are both disabled and the
 * rail explains why. That is the whole gate the flow asks for, in one place, so
 * neither surface can enable one control without the other.
 */
export default function SelectionPanel({
  product,
  quantity,
  onQuantityChange,
  onAdd,
  error,
  t,
}: Readonly<Props>) {
  const stock = podProductStock(product);
  const image = podProductImage(product);
  const atMax = stock > 0 && quantity >= stock;
  const step = (delta: number) => onQuantityChange(clampPodProductQty(quantity + delta, product));

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="subtitle1">{t('podProduct.details')}</Typography>

      {product ? (
        <Stack spacing={1.5}>
          <Box
            sx={{
              height: 160,
              borderRadius: 2,
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
              <ImageNotSupportedIcon color="disabled" />
            )}
          </Box>
          <Typography variant="h6">{product.product_name}</Typography>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1
            }}>
            <Typography variant="subtitle1" sx={{
              color: "primary.main"
            }}>
              {t('podProduct.perUnit', { vars: { cost: formatMoney(product.unit_cost) } })}
            </Typography>
            <Chip
              size="small"
              color={stock > 0 ? 'default' : 'warning'}
              label={
                stock > 0
                  ? t('podProduct.unitsLeft', { vars: { count: stock } })
                  : t('podProduct.outOfStock')
              }
            />
          </Stack>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {product.description?.trim() ||
              product.short_description?.trim() ||
              t('podProduct.noDescription')}
          </Typography>
          <Divider />
          <InfoLine label={t('podProduct.brand')} value={product.brand_name} />
          <InfoLine label={t('podProduct.sku')} value={product.sku} />
          <InfoLine label={t('podProduct.unitType')} value={product.unit_type} />
          <InfoLine label={t('podProduct.weightVolume')} value={product.weight_volume} />
          {product.tags && product.tags.length > 0 && (
            <Stack
              direction="row"
              sx={{
                flexWrap: "wrap",
                gap: 0.5
              }}>
              {product.tags.map((tag) => (
                <Chip key={tag} size="small" variant="outlined" label={tag} />
              ))}
            </Stack>
          )}
        </Stack>
      ) : (
        <Alert severity="info">{t('podProduct.quantityHint')}</Alert>
      )}

      <Divider />

      <Stack spacing={1}>
        <Typography variant="subtitle2" color={product ? 'text.primary' : 'text.disabled'}>
          {t('podProduct.quantity')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <IconButton
            aria-label={t('podProduct.decreaseQty')}
            onClick={() => step(-1)}
            disabled={!product || quantity <= 1}
            size="small"
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle1" sx={{ minWidth: 40, textAlign: 'center' }}>
            {quantity}
          </Typography>
          <IconButton
            aria-label={t('podProduct.increaseQty')}
            onClick={() => step(1)}
            disabled={!product || atMax}
            size="small"
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>
        {product && atMax && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('podProduct.maxQtyHint', { vars: { count: stock } })}
          </Typography>
        )}
        {product && (
          <Typography variant="subtitle2">
            {t('podProduct.lineTotal', {
              vars: { amount: formatMoney(podProductLineTotal(product, quantity)) },
            })}
          </Typography>
        )}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Deliberately NOT disabled when nothing is picked. Adding is still
          refused — the parent's onAdd is a no-op without a product — but a
          disabled button swallows the click, and the flow requires that
          attempting to continue with no selection SAYS so. */}
      <Button variant="contained" onClick={onAdd} fullWidth>
        {t('podProduct.addToPod')}
      </Button>
    </Stack>
  );
}
