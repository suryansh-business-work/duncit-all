import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { useTranslation } from '../../i18n/useTranslation';
import { useSearchCategories } from '../search-page/useSearchDiscovery';
import { usePricing } from '../../hooks/usePricing';
import SectionHeader from '../../components/SectionHeader';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import PodShopSlider from './PodShopSlider';
import ShopProductCard from './ShopProductCard';
import ShopFilterBar from './ShopFilterBar';
import { useQuickAddToCart } from './useQuickAddToCart';
import { useShopFilters } from './useShopFilters';
import { SHOP_PRODUCTS, type ShopProduct } from './queries';

/** Pod Shop — the platform-wide browse catalogue of approved, pod-available
 * products with a filter button (Super → Category → Sub cascade, rating,
 * include-out-of-stock and sort) and debounced search. Tapping a product opens
 * its detail page; purchases happen through a pod's shop. */
export default function ShopPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format: priceFormat } = usePricing();
  const { data, loading, error } = useQuery<any>(SHOP_PRODUCTS, { fetchPolicy: 'cache-and-network' });
  const { all, matchesCategory } = useSearchCategories();
  const { addingId, add } = useQuickAddToCart();
  const products = useMemo<ShopProduct[]>(() => data?.availablePodProducts ?? [], [data]);
  const filters = useShopFilters(all, products, matchesCategory);

  if (loading && !data)
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2.5} sx={{ py: 0.5 }}>
      {/* The cart lives in the app header now, on every page — not just here. */}
      <PageHeader title={t('mweb.shop.title')} />
      <PodShopSlider />
      <ShopFilterBar filters={filters} />
      {filters.visible.length === 0 ? (
        <EmptyState icon={<SearchOffRoundedIcon />} title={t('mweb.shop.emptyState')} />
      ) : (
        <Stack spacing={1.5}>
          <SectionHeader title={t('mweb.shop.featured')} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            {filters.visible.map((product) => (
              <ShopProductCard
                key={product.id}
                product={product}
                priceFormat={priceFormat}
                adding={addingId === product.id}
                onOpen={(id) => navigate(`/product/${id}`)}
                onQuickAdd={add}
              />
            ))}
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
