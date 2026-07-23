import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { alpha, useTheme } from '@mui/material/styles';
import { cartLineKey, type CartLine } from '../../components/cart/CartContext';
import { formatMoney } from '../checkout-page/checkoutMath';
import type { ProductShippingQuote } from '../checkout-page/queries';

interface Props {
  podTitle: string;
  lines: CartLine[];
  breakup: any;
  subtotal: number;
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
}

/** The delivery row value: a prompt until a valid pincode, a spinner label while
 * quoting, else the live shipping total. Extracted to keep the summary free of a
 * nested ternary (S3358). */
function deliveryValue(pincodeValid: boolean, shippingLoading: boolean, quote: ProductShippingQuote | null, currency: string): string {
  if (!pincodeValid) return 'Enter pincode';
  if (shippingLoading && !quote) return 'Calculating…';
  return formatMoney(currency, quote?.total ?? 0);
}

/** Product-only order summary for the standalone product checkout: line items,
 * products subtotal, live delivery (ShipRocket) and the payable total. No pod
 * ticket / "Event ticket" line — pods and products never share a payment. */
export default function ProductOrderSummaryCard({ podTitle, lines, breakup, subtotal, quote, shippingLoading, pincodeValid }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const delivery = deliveryValue(pincodeValid, shippingLoading, quote, breakup.currency);
  const estimated = !!quote && !quote.all_quoted;

  return (
    <Card sx={{ flex: 1, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.82), color: 'text.primary', boxShadow: 'none', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
      <CardContent sx={{ p: 1.75 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ShoppingBagIcon sx={{ color: '#ff8b5f' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>Order summary</Typography>
            <Typography variant="subtitle1" fontWeight={900} noWrap sx={{ lineHeight: 1.1 }}>{podTitle}</Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.75}>
          {lines.map((line) => (
            <Row
              key={cartLineKey(line)}
              label={`${line.product_name}${line.variant_label ? ` — ${line.variant_label}` : ''} × ${line.quantity}`}
              value={fmt(line.unit_cost * line.quantity)}
            />
          ))}
          <Divider sx={{ my: 1 }} />
          <Row label="Subtotal" value={fmt(subtotal)} />
          <Row label="Delivery" value={delivery} />
          {estimated && (
            <Typography variant="caption" color="text.secondary">
              Estimated delivery — final charge confirmed at checkout.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>Inclusive of:</Typography>
          <Row label={`GST (${breakup.gstPct}%)`} value={fmt(breakup.gst)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Total payable" value={fmt(breakup.total)} bold />
        </Stack>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 700}>{value}</Typography>
    </Stack>
  );
}
