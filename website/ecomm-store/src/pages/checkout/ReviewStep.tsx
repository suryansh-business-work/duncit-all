import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import { useCart } from '../../app/providers/CartProvider';
import { StoreImage } from '../../components/StoreImage';
import type { StoreCheckoutQuote } from '../../graphql/cart';
import { useMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';
import { QuoteSummary } from './payment-step/QuoteSummary';
import type { CheckoutControls } from './useCheckoutState';
import { usePlaceOrder } from './usePlaceOrder';

function Detail({ title, lines }: Readonly<{ title: string; lines: string[] }>) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      {lines.filter(Boolean).map((line) => (
        <Typography key={line} variant="body2">
          {line}
        </Typography>
      ))}
    </Paper>
  );
}

/** Step 4: everything once more, then Place order. */
export function ReviewStep({ controls, quote }: Readonly<{ controls: CheckoutControls; quote: StoreCheckoutQuote }>) {
  const { t } = useStoreT();
  const money = useMoney();
  const { cart } = useCart();
  const { contact, address, method } = controls.state;
  const { place, busy, error } = usePlaceOrder(controls, cart?.coupon_code ?? '', quote.coins_redeemed);
  const methodLabel = method === 'COD' ? t('ecommStore.payment.cod') : t('ecommStore.payment.online');
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Detail title={t('ecommStore.checkout.contactTitle')} lines={[contact?.name ?? '', contact?.email ?? '', contact?.phone ?? '']} />
        <Detail
          title={t('ecommStore.checkout.addressTitle')}
          lines={[address?.name ?? '', address?.line1 ?? '', address?.line2 ?? '', [address?.city, address?.state, address?.pincode].filter(Boolean).join(', ')]}
        />
        <Detail title={t('ecommStore.payment.title')} lines={[methodLabel]} />
      </Stack>
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {quote.lines.map((line) => (
          <Stack component="li" key={`${line.product_id}:${line.variant_id}`} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 56, flexShrink: 0 }}>
              <StoreImage src={line.image_url} alt={line.name} width={56} height={56} sx={{ borderRadius: 1 }} />
            </Box>
            <Typography sx={{ flexGrow: 1 }}>{t('ecommStore.checkout.lineQty', { vars: { name: line.name, qty: line.quantity } })}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{money(line.line_total)}</Typography>
          </Stack>
        ))}
      </Stack>
      <QuoteSummary quote={quote} />
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton variant="contained" size="large" loading={busy} onClick={place} sx={{ fontSize: '1.2rem', py: 1.5 }}>
        {t('ecommStore.checkout.place', { vars: { total: money(quote.total) } })}
      </DuncitButton>
    </Stack>
  );
}
