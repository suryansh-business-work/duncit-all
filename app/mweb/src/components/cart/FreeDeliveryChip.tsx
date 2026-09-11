import { Chip } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { useTranslation } from '../../i18n/useTranslation';

const CHIP_SX = {
  height: 22,
  minHeight: 22,
  fontSize: 11,
  fontWeight: 600,
  color: 'success.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.success.main, 0.12),
  '& .MuiChip-icon': { color: 'inherit', fontSize: 13, ml: 0.75 },
} as const;

/** The small tonal "Free delivery" pill shown against a cart/summary line whose
 * subtotal reaches the product's free-delivery threshold. The shipping quote's
 * `free` flag stays authoritative — this is a preview hint only. Native twin:
 * components/cart/FreeDeliveryBadge. */
export default function FreeDeliveryChip() {
  const { t } = useTranslation();
  return <Chip size="small" icon={<LocalShippingOutlinedIcon />} label={t('mweb.cart.freeDelivery')} sx={CHIP_SX} />;
}
