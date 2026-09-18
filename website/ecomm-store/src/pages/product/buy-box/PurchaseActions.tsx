import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import { DuncitButton } from '@duncit/buttons';

import { useCart } from '../../../app/providers/CartProvider';
import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';

interface PurchaseActionsProps {
  productId: string;
  variantId: string;
  qty: number;
  onSubscribe: () => void;
}

/** Add to Cart (the big brand-red pill), Buy now, and — when on — Subscribe & save. */
export function PurchaseActions({ productId, variantId, qty, onSubscribe }: Readonly<PurchaseActionsProps>) {
  const { t } = useStoreT();
  const navigate = useNavigate();
  const settings = useStoreSettings();
  const { addToCart } = useCart();
  const buyNow = async () => {
    if (await addToCart(productId, variantId, qty)) navigate(paths.checkout);
  };
  return (
    <Stack spacing={1.5}>
      <DuncitButton
        variant="contained"
        fullWidth
        onClick={() => addToCart(productId, variantId, qty)}
        sx={{ bgcolor: T.brand, '&:hover': { bgcolor: T.cta }, fontSize: '1.2rem', fontWeight: 800, py: 1.75 }}
      >
        {t('ecommStore.product.addToCart')}
      </DuncitButton>
      <DuncitButton variant="outlined" fullWidth size="large" onClick={buyNow}>
        {t('ecommStore.product.buyNow')}
      </DuncitButton>
      {settings.autoship_enabled ? (
        <DuncitButton fullWidth size="large" startIcon={<SyncRoundedIcon />} onClick={onSubscribe} sx={{ bgcolor: T.brandTint, color: T.ink }}>
          {t('ecommStore.autoship.subscribeSave', { vars: { pct: settings.autoship_discount_pct } })}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}
