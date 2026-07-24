import { Box, ButtonBase, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { alpha, useTheme } from '@mui/material/styles';
import {
  cartLineKey,
  lineQualifiesFreeDelivery,
  type CartLine,
} from '../../components/cart/CartContext';
import { formatMoney } from '../checkout-page/checkoutMath';
import type { ProductShippingQuote, ProductShippingQuoteLine } from '../checkout-page/queries';

interface Props {
  lines: CartLine[];
  breakup: any;
  subtotal: number;
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
  /** Opens the product-detail dialog for a line. Products and Pods are separate
   * entities — the checkout lists products only, each with an info button. */
  onInfo: (productId: string) => void;
}

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 700}>{value}</Typography>
    </Stack>
  );
}

/** The line's product photo as a tappable thumbnail that opens the product
 * details; falls back to a shopping-bag placeholder when the line has no image. */
function LineThumb({
  line,
  onInfo,
}: Readonly<{ line: CartLine; onInfo: (productId: string) => void }>) {
  return (
    <ButtonBase
      aria-label={`View ${line.product_name} details`}
      onClick={() => onInfo(line.product_id)}
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'action.hover',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {line.image_url ? (
        <Box
          component="img"
          src={line.image_url}
          alt={line.product_name}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <ShoppingBagIcon fontSize="small" sx={{ color: 'text.disabled' }} />
      )}
    </ButtonBase>
  );
}

/** One product line: a tappable product photo that opens the product details,
 * the label + qty, a "Free delivery" badge when the line meets its product's
 * threshold, and the line total. No pod title — products and pods are separate. */
function LineRow({
  line,
  fmt,
  onInfo,
}: Readonly<{ line: CartLine; fmt: (value: number) => string; onInfo: (productId: string) => void }>) {
  const label = `${line.product_name}${line.variant_label ? ` — ${line.variant_label}` : ''} × ${line.quantity}`;
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <LineThumb line={line} onInfo={onInfo} />
        <Typography variant="body2" fontWeight={500} noWrap>{label}</Typography>
        {lineQualifiesFreeDelivery(line) && (
          <Chip size="small" color="success" label="Free delivery" sx={{ height: 18, fontSize: 11, fontWeight: 700 }} />
        )}
      </Stack>
      <Typography variant="body2" fontWeight={700}>{fmt(line.unit_cost * line.quantity)}</Typography>
    </Stack>
  );
}

/** A warehouse group's delivery charge: "Free" when every line in the group met
 * its free-delivery threshold, else the (live or manual-fallback) charge. */
function quoteLineValue(line: ProductShippingQuoteLine, currency: string): string {
  if (line.free) return 'Free';
  return formatMoney(currency, line.charge);
}

/** A warehouse group's row label: the courier name (the server emits '' for free
 * and manual-fallback groups — fall back to "Delivery"), marked "(estimated)"
 * when ShipRocket could not price it live. No pod title — checkout hides pod
 * detail (products and pods are separate entities). */
function quoteLineLabel(line: ProductShippingQuoteLine): string {
  const courier = line.courier_name || 'Delivery';
  return line.quoted ? courier : `${courier} (estimated)`;
}

/** Delivery rows — a prompt until a valid pincode, a spinner label while
 * quoting, else ONE ROW PER warehouse group plus the delivery total. */
function DeliveryRows({
  quote,
  shippingLoading,
  pincodeValid,
  currency,
}: Readonly<{
  quote: ProductShippingQuote | null;
  shippingLoading: boolean;
  pincodeValid: boolean;
  currency: string;
}>) {
  if (!pincodeValid) return <Row label="Delivery" value="Enter pincode" />;
  if (!quote) {
    return <Row label="Delivery" value={shippingLoading ? 'Calculating…' : formatMoney(currency, 0)} />;
  }
  return (
    <>
      {quote.lines.map((line) => (
        <Row
          key={`${line.pod_id ?? ''}:${line.warehouse_id}`}
          label={quoteLineLabel(line)}
          value={quoteLineValue(line, currency)}
        />
      ))}
      <Row label="Delivery total" value={formatMoney(currency, quote.total)} />
    </>
  );
}

/** Product-only order summary for the combined product checkout: a flat product
 * line list (each with an info button), products subtotal, per-warehouse
 * delivery (ShipRocket) and the payable total. No pod title / "Event ticket"
 * line — pods and products are separate entities and never share a payment. */
export default function ProductOrderSummaryCard({ lines, breakup, subtotal, quote, shippingLoading, pincodeValid, onInfo }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const estimated = !!quote && !quote.all_quoted;

  return (
    <Card sx={{ flex: 1, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.82), color: 'text.primary', boxShadow: 'none', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
      <CardContent sx={{ p: 1.75 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ShoppingBagIcon sx={{ color: '#ff8b5f' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>Order summary</Typography>
            <Typography variant="subtitle1" fontWeight={900} noWrap sx={{ lineHeight: 1.1 }}>Your order</Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.75}>
          <Stack spacing={0.5}>
            {lines.map((line) => (
              <LineRow key={`${line.pod_id}:${cartLineKey(line)}`} line={line} fmt={fmt} onInfo={onInfo} />
            ))}
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Row label="Subtotal" value={fmt(subtotal)} />
          <DeliveryRows quote={quote} shippingLoading={shippingLoading} pincodeValid={pincodeValid} currency={breakup.currency} />
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
