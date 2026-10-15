import { useEffect, useMemo } from 'react';
import { skipToken, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { useTranslation } from '../../i18n/useTranslation';
import { useSearchCategories } from '../search-page/useSearchDiscovery';
import { usePricing } from '../../hooks/usePricing';
import SectionHeader from '../../components/SectionHeader';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import PodShopSlider from './PodShopSlider';
import ShopProductCard from './ShopProductCard';
import ShopFilterBar from './ShopFilterBar';
import FilterChipRow, { withAll } from './ShopFilterBar/FilterChipRow';
import { useQuickAddToCart } from './useQuickAddToCart';
import { useDeliveryAddress } from '../../hooks/useDeliveryAddress';
import { useShopFilters } from './useShopFilters';
import { SHOP_PRODUCTS, type ShopProduct } from './queries';

/** Pod Shop — the platform-wide browse catalogue of approved, pod-available
 * products: debounced search with a filter button (Category → Sub, rating,
 * include-out-of-stock and sort), the promo slider, then the super-category
 * pills over the product grid. The app header shows the "Deliver to" address
 * here instead of the city. Tapping a product opens its detail page. */
export default function ShopPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format: priceFormat } = usePricing();
  // The "Deliver to" pincode hides brands that do not deliver there; wait for
  // it so the list is not fetched twice on open.
  const delivery = useDeliveryAddress();
  const { data, loading: productsLoading, error, refetch } = useQuery<{ availablePodProducts: ShopProduct[] }>(
    SHOP_PRODUCTS,
    delivery.loading
      ? skipToken
      : {
          variables: delivery.selected?.pincode ? { deliveryPincode: delivery.selected.pincode } : {},
          fetchPolicy: 'cache-and-network',
        },
  );
  const loading = productsLoading || delivery.loading;
  const { all, matchesCategory } = useSearchCategories();
  const { addingId, lineOf, setQuantity } = useQuickAddToCart();
  const products = useMemo<ShopProduct[]>(() => data?.availablePodProducts ?? [], [data]);
  const filters = useShopFilters(all, products, matchesCategory);
  useEffect(() => {
    if (error) logs.mWeb.error('ShopPage', 'loadProducts', { error });
  }, [error]);

  if (loading && !data)
    return (
      <Stack
        data-testid="shop-loading"
        sx={{
          alignItems: 'center',
          p: 6,
        }}
      >
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  if (error)
    return (
      <Alert
        data-testid="shop-error"
        severity="error"
        action={
          <DuncitButton
            data-testid="shop-error-retry"
            color="inherit"
            size="small"
            onClick={() => refetch()}
          >
            {t('mweb.shop.retry')}
          </DuncitButton>
        }
      >
        {t('mweb.shop.loadError')}
      </Alert>
    );

  return (
    <Stack data-testid="shop-page" spacing={2.5} sx={{ py: 0.5 }}>
      {/* The cart lives in the app header now, on every page — not just here. */}
      <PageHeader testId="shop-page-header" title={t('mweb.shop.title')} />
      <ShopFilterBar filters={filters} />
      <PodShopSlider />
      {filters.superOptions.length > 0 && (
        <Box data-testid="shop-category-pills" role="group" aria-label={t('mweb.common.category')}>
          <FilterChipRow
            options={withAll(filters.superOptions, t('mweb.common.all'))}
            value={filters.superId}
            onSelect={filters.selectSuper}
            idPrefix="shop-super"
          />
        </Box>
      )}
      {filters.visible.length === 0 ? (
        <EmptyState
          testId="shop-empty"
          icon={<SearchOffRoundedIcon />}
          title={t('mweb.shop.emptyState')}
        />
      ) : (
        <Stack spacing={1.5}>
          <SectionHeader testId="shop-featured-heading" title={t('mweb.shop.featured')} />
          <Box
            data-testid="shop-product-grid"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            {filters.visible.map((product) => {
              const line = lineOf(product.id);
              return (
                <ShopProductCard
                  key={product.id}
                  product={product}
                  priceFormat={priceFormat}
                  quantity={line?.quantity ?? 0}
                  max={line?.max_quantity ?? product.pod_available_count}
                  busy={addingId === product.id}
                  onOpen={(id) => navigate(`/product/${id}`)}
                  onQuantity={setQuantity}
                />
              );
            })}
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
