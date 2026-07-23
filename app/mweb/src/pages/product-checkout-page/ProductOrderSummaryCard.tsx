import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
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
}

interface PodGroup {
  pod_id: string;
  pod_title: string;
  lines: CartLine[];
}

/** Cart lines grouped by pod, preserving cart order (for the sub-headers). */
function groupByPod(lines: CartLine[]): PodGroup[] {
  const groups: PodGroup[] = [];
  const byPod = new Map<string, PodGroup>();
  for (const line of lines) {
    let group = byPod.get(line.pod_id);
    if (!group) {
      group = { pod_id: line.pod_id, pod_title: line.pod_title, lines: [] };
      byPod.set(line.pod_id, group);
      groups.push(group);
    }
    group.lines.push(line);
  }
  return groups;
}

function Row({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 500}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 900 : 700}>{value}</Typography>
    </Stack>
  );
}

/** One product line: label + qty, a "Free delivery" badge when the line meets
 * its product's threshold, and the line total. */
function LineRow({ line, fmt }: Readonly<{ line: CartLine; fmt: (value: number) => string }>) {
  const label = `${line.product_name}${line.variant_label ? ` — ${line.variant_label}` : ''} × ${line.quantity}`;
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
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
          key={line.warehouse_id}
          label={line.quoted ? line.courier_name : `${line.courier_name} (estimated)`}
          value={quoteLineValue(line, currency)}
        />
      ))}
      <Row label="Delivery total" value={formatMoney(currency, quote.total)} />
    </>
  );
}

/** Product-only order summary for the combined product checkout: line items
 * grouped by pod, products subtotal, per-warehouse delivery (ShipRocket) and
 * the payable total. No pod ticket / "Event ticket" line — pods and products
 * never share a payment. */
export default function ProductOrderSummaryCard({ lines, breakup, subtotal, quote, shippingLoading, pincodeValid }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const groups = groupByPod(lines);
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
          {groups.map((group) => (
            <Box key={group.pod_id}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }} noWrap>
                {group.pod_title}
              </Typography>
              <Stack spacing={0.5}>
                {group.lines.map((line) => (
                  <LineRow key={`${group.pod_id}:${cartLineKey(line)}`} line={line} fmt={fmt} />
                ))}
              </Stack>
            </Box>
          ))}
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
