import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';

/** Empty state when the cart was cleared before reaching checkout. */
export function EmptyProductCart({ onCart }: Readonly<{ onCart: () => void }>) {
  const { t } = useTranslation();
  return (
    <EmptyState
      testID="product-checkout-empty"
      icon="shopping-bag"
      title={t('mweb.checkout.nothingToCheckout')}
      actionLabel={t('mweb.checkout.backToCart')}
      onAction={onCart}
      actionTestID="product-checkout-back-to-cart"
    />
  );
}
