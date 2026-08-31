import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
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
import ShopFilterBar from './ShopFilterBar';
import { useQuickAddToCart } from './useQuickAddToCart';
import { useShopFilters } from './useShopFilters';
import { SHOP_PRODUCTS, type ShopProduct } from './queries';
import type { Translate } from '../../i18n/fallback';

const trustItems = (t: Translate) => [
  { Icon: VerifiedUserRoundedIcon, title: t('mweb.shop.trustedPods'), caption: t('mweb.shop.qualityProducts') },
  { Icon: LocalOfferRoundedIcon, title: t('mweb.shop.bestPrices'), caption: t('mweb.shop.greatDeals') },
  { Icon: LocalShippingRoundedIcon, title: t('mweb.shop.safeDelivery'), caption: t('mweb.shop.hassleFree') },
] as const;

/** Reassurance strip below the grid — static marketing copy. */
function TrustBar() {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: "space-around",
        bgcolor: 'action.hover',
        borderRadius: '16px',
        p: 1.5,
        mt: 1
      }}>
      {trustItems(t).map(({ Icon, title, caption }) => (
        <Stack key={title} direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Icon sx={{ color: 'primary.main' }} fontSize="small" />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.1 }}>
              {title}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                lineHeight: 1.1
              }}>
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
    <Stack spacing={2} sx={{ py: 0.5 }}>
      {/* The cart lives in the app header now, on every page — not just here. */}
      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
        {t('mweb.shop.title')}
      </Typography>
      <PodShopSlider />
      <ShopFilterBar filters={filters} />
      {filters.visible.length === 0 ? (
        <Alert severity="info">{t('mweb.shop.emptyState')}</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
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
