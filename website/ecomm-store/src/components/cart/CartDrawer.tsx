import { useId } from 'react';
import { Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';

import { useCart } from '../../app/providers/CartProvider';
import { useStoreT } from '../../i18n';
import { CartLines } from './CartContents';
import { CartSummary } from './CartSummary';

/** The slide-in cart, opened from the header icon and after every add. */
export function CartDrawer() {
  const { t } = useStoreT();
  const { cart, drawerOpen, setDrawerOpen } = useCart();
  const titleId = useId();
  const close = () => setDrawerOpen(false);
  const hasLines = (cart?.lines.length ?? 0) > 0;
  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={close}
      slotProps={{ paper: { sx: { width: 'min(100vw, 420px)' }, role: 'dialog', 'aria-labelledby': titleId } }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
        <Typography id={titleId} variant="h3" component="h2">
          {t('ecommStore.cart.title')}
        </Typography>
        <DuncitIconButton aria-label={t('ecommStore.cart.close')} onClick={close}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
        <CartLines onNavigate={close} />
      </Box>
      {cart && hasLines ? (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <CartSummary cart={cart} onCheckout={close} />
        </Box>
      ) : null}
    </Drawer>
  );
}
