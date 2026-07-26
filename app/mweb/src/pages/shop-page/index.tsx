import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import { useTranslation } from '../../i18n/useTranslation';
import { useSearchCategories } from '../search-page/useSearchDiscovery';
import { usePricing } from '../../hooks/usePricing';
import PodShopSlider from './PodShopSlider';
import ShopProductCard from './ShopProductCard';
import ShopHeaderCart from './ShopHeaderCart';
import ShopFilterBar from './ShopFilterBar';
import { useQuickAddToCart } from './useQuickAddToCart';
import { useShopFilters } from './useShopFilters';
import { SHOP_PRODUCTS, type ShopProduct } from './queries';

const TRUST_ITEMS = [
  { Icon: VerifiedUserRoundedIcon, title: 'Trusted Pods', caption: 'Quality Products' },
  { Icon: LocalOfferRoundedIcon, title: 'Best Prices', caption: 'Great Deals' },
  { Icon: LocalShippingRoundedIcon, title: 'Safe Delivery', caption: 'Hassle Free' },
] as const;

/** Reassurance strip below the grid — static marketing copy. */
function TrustBar() {
  return (
    <Stack
      direction="row"
      justifyContent="space-around"
      sx={{ bgcolor: 'action.hover', borderRadius: 3, p: 1.5, mt: 1 }}
    >
      {TRUST_ITEMS.map(({ Icon, title, caption }) => (
        <Stack key={title} direction="row" spacing={1} alignItems="center">
          <Icon sx={{ color: 'primary.main' }} fontSize="small" />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', lineHeight: 1.1 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
              {caption}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

/** Pod Shop — the platform-wide browse catalogue of approved, pod-available
 * products with a filter button (Super → Category → Sub cascade, rating,
 * include-out-of-stock and sort), debounced search and a header cart. Tapping a
 * product opens its detail page; purchases happen through a pod's shop. */
export default function ShopPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { format: priceFormat } = usePricing();
  const { data, loading, error } = useQuery(SHOP_PRODUCTS, { fetchPolicy: 'cache-and-network' });
  const { all, matchesCategory } = useSearchCategories();
  const { addingId, add } = useQuickAddToCart();
  const products = useMemo<ShopProduct[]>(() => data?.availablePodProducts ?? [], [data]);
  const filters = useShopFilters(all, products, matchesCategory);

  if (loading && !data)
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2} sx={{ py: 0.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
          {t('mweb.shop.title')}
        </Typography>
        <ShopHeaderCart />
      </Stack>
      <PodShopSlider />
      <ShopFilterBar filters={filters} />
      {filters.visible.length === 0 ? (
        <Alert severity="info">{t('mweb.shop.emptyState')}</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {t('mweb.shop.featured')}
          </Typography>
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
        </>
      )}
      <TrustBar />
    </Stack>
  );
}
