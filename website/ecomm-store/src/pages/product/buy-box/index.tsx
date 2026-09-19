import { useState, type ReactNode } from 'react';
import { Alert, Stack, Typography } from '@mui/material';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import type { StoreProduct, StoreVariant } from '../../../graphql/product';
import { useStoreT } from '../../../i18n';
import { AutoshipDialog } from '../autoship-subscribe';
import { PurchaseActions } from './PurchaseActions';
import { BigQuantity } from '../BigQuantity';
import { OfferPill } from '../OfferPill';
import { DeliveryCheckForm } from '../delivery-check';
import { ProductBadges } from '../ProductBadges';
import { StockAlertForm } from '../stock-alert';

interface BuyBoxProps {
  product: StoreProduct;
  variant: StoreVariant | null;
  /** Rendered between the title and the quantity — the option pickers. */
  picker: ReactNode;
}

/** Title, rating, options, the big quantity, price, Add to Cart / Buy now, and delivery. */
export function BuyBox({ product, variant, picker }: Readonly<BuyBoxProps>) {
  const { t } = useStoreT();
  const settings = useStoreSettings();
  const { signedIn, openSignIn } = useStoreSession();
  const [qty, setQty] = useState(Math.max(1, product.min_order_qty));
  const [autoshipOpen, setAutoshipOpen] = useState(false);
  const available = variant?.available ?? product.available;
  const inStock = variant?.in_stock ?? product.in_stock;
  const limit = product.max_per_order > 0 ? product.max_per_order : settings.max_qty_per_line;
  const max = Math.max(1, Math.min(limit, available));
  const needsChoice = product.has_variants && !variant;
  const variantId = variant?.id ?? '';
  const canBuy = inStock && !needsChoice;

  const subscribe = () => (signedIn ? setAutoshipOpen(true) : openSignIn());

  return (
    <Stack spacing={2.5}>
      {product.short_description ? <Typography>{product.short_description}</Typography> : null}
      {picker}
      <BigQuantity
        value={Math.min(qty, max)}
        min={Math.max(1, product.min_order_qty)}
        max={max}
        onChange={setQty}
        price={variant?.price ?? product.price}
        mrp={variant?.mrp ?? product.mrp}
        discountPct={variant?.discount_pct ?? product.discount_pct}
      />
      {product.offer_text ? <OfferPill text={product.offer_text} /> : null}
      {needsChoice ? <Alert severity="info">{t('ecommStore.product.chooseOption')}</Alert> : null}
      {inStock && product.low_stock ? <Alert severity="warning">{t('ecommStore.product.lowStock', { vars: { count: available } })}</Alert> : null}
      {canBuy ? (
        <PurchaseActions productId={product.id} variantId={variantId} qty={Math.min(qty, max)} onSubscribe={subscribe} />
      ) : null}
      {inStock ? null : <StockAlertForm productId={product.id} variantId={variant?.id ?? null} />}
      <ProductBadges product={product} />
      <DeliveryCheckForm productId={product.id} variantId={variant?.id ?? null} />
      {autoshipOpen ? (
        <AutoshipDialog product={product} variant={variant} qty={Math.min(qty, max)} onClose={() => setAutoshipOpen(false)} />
      ) : null}
    </Stack>
  );
}
