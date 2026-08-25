import { Box, ButtonBase, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { alpha, useTheme } from '@mui/material/styles';
import {
  cartLineKey,
  lineQualifiesFreeDelivery,
  type CartLine,
} from '../../components/cart/CartContext';
import { formatMoney } from '../checkout-page/checkoutMath';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import type { ProductShippingQuote, ProductShippingQuoteLine } from '../checkout-page/queries';
import CoinSummaryRows from '../checkout-page/CoinSummaryRows';
import type { CoinCheckoutSummary } from '@duncit/utils';

interface Props {
  /** Coins spent, left and earned on this bill. Absent hides the coin block. */
  coins?: CoinCheckoutSummary | null;
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
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "center"
      }}>
      <Typography variant={bold ? 'subtitle1' : 'body2'} sx={{
        fontWeight: bold ? 700 : 500
      }}>{label}</Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} sx={{
        fontWeight: bold ? 700 : 600
      }}>{value}</Typography>
    </Stack>
  );
}

/** The line's product photo as a tappable thumbnail that opens the product
 * details; falls back to a shopping-bag placeholder when the line has no image. */
function LineThumb({
  line,
  onInfo,
}: Readonly<{ line: CartLine; onInfo: (productId: string) => void }>) {
  const { t } = useTranslation();
  return (
    <ButtonBase
      aria-label={t('mweb.checkout.viewProduct', { vars: { name: line.product_name } })}
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
  const { t } = useTranslation();
  const variant = line.variant_label ? ` — ${line.variant_label}` : '';
  const label = `${line.product_name}${variant} × ${line.quantity}`;
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "center"
      }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          minWidth: 0
        }}>
        <LineThumb line={line} onInfo={onInfo} />
        <Typography variant="body2" noWrap sx={{
          fontWeight: 500
        }}>{label}</Typography>
        {lineQualifiesFreeDelivery(line) && (
          <Chip size="small" color="success" label={t('mweb.cart.freeDelivery')} sx={{ height: 18, fontSize: 11, fontWeight: 700 }} />
        )}
      </Stack>
      <Typography variant="body2" sx={{
        fontWeight: 700
      }}>{fmt(line.unit_cost * line.quantity)}</Typography>
    </Stack>
  );
}

/** A warehouse group's delivery charge: "Free" when every line in the group met
 * its free-delivery threshold, else the (live or manual-fallback) charge. */
function quoteLineValue(line: ProductShippingQuoteLine, currency: string, t: Translate): string {
  if (line.free) return t('mweb.checkout.deliveryFree');
  return formatMoney(currency, line.charge);
}

/** A warehouse group's row label: the courier name (the server emits '' for free
 * and manual-fallback groups — fall back to "Delivery"), marked "(estimated)"
 * when ShipRocket could not price it live. No pod title — checkout hides pod
 * detail (products and pods are separate entities). */
function quoteLineLabel(line: ProductShippingQuoteLine, t: Translate): string {
  const courier = line.courier_name || t('mweb.checkout.delivery');
  return line.quoted ? courier : t('mweb.checkout.deliveryEstimated', { vars: { courier } });
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
  const { t } = useTranslation();
  const deliveryLabel = t('mweb.checkout.delivery');
  if (!pincodeValid) return <Row label={deliveryLabel} value={t('mweb.checkout.deliveryEnterPincode')} />;
  if (!quote) {
    const pending = shippingLoading ? t('mweb.checkout.deliveryCalculating') : formatMoney(currency, 0);
    return <Row label={deliveryLabel} value={pending} />;
  }
  return (
    <>
      {quote.lines.map((line) => (
        <Row
          key={`${line.pod_id ?? ''}:${line.warehouse_id}`}
          label={quoteLineLabel(line, t)}
          value={quoteLineValue(line, currency, t)}
        />
      ))}
      <Row label={t('mweb.checkout.deliveryTotal')} value={formatMoney(currency, quote.total)} />
    </>
  );
}

/** Product-only order summary for the combined product checkout: a flat product
 * line list (each with an info button), products subtotal, per-warehouse
 * delivery (ShipRocket) and the payable total. No pod title / "Event ticket"
 * line — pods and products are separate entities and never share a payment. */
export default function ProductOrderSummaryCard({ lines, breakup, subtotal, quote, shippingLoading, pincodeValid, onInfo, coins = null }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fmt = (value: number) => formatMoney(breakup.currency, value);
  const estimated = !!quote && !quote.all_quoted;

  return (
    <Card sx={{ flex: 1, borderRadius: '16px', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.82), color: 'text.primary', boxShadow: 'none', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
      <CardContent sx={{ p: 1.75 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <ShoppingBagIcon sx={{ color: '#ff8b5f' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>{t('mweb.checkout.orderSummary')}</Typography>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{
                fontWeight: 700,
                lineHeight: 1.1
              }}>{t('mweb.checkout.yourOrder')}</Typography>
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
          <Row label={t('mweb.checkout.subtotal')} value={fmt(subtotal)} />
          <DeliveryRows quote={quote} shippingLoading={shippingLoading} pincodeValid={pincodeValid} currency={breakup.currency} />
          {estimated && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.checkout.deliveryEstimatedNote')}
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              mt: 0.5
            }}>{t('mweb.checkout.inclusiveOf')}</Typography>
          <Row label={t('mweb.checkout.gst', { vars: { pct: breakup.gstPct } })} value={fmt(breakup.gst)} />
          <Divider sx={{ my: 1 }} />
          <Row label={t('mweb.checkout.totalPayable')} value={fmt(breakup.total)} bold />
          <CoinSummaryRows coins={coins} />
        </Stack>
      </CardContent>
    </Card>
  );
}
