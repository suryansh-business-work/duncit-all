import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import { useSearchCategories } from '../search-page/useSearchDiscovery';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePricing } from '../../hooks/usePricing';
import PodShopSlider from './PodShopSlider';
import ShopProductCard from './ShopProductCard';
import ShopHeaderCart from './ShopHeaderCart';
import ShopFilterBar from './ShopFilterBar';
import { useQuickAddToCart } from './useQuickAddToCart';
import { SHOP_PRODUCTS, sortShopProducts, type ShopProduct, type ShopSort } from './queries';

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
 * products with a filter button (category + sort), debounced search and a header
 * cart. Tapping a product opens its detail page; purchases happen through a
 * pod's shop. */
export default function ShopPage() {
  const navigate = useNavigate();
  const { format: priceFormat } = usePricing();
  const { data, loading, error } = useQuery(SHOP_PRODUCTS, { fetchPolicy: 'cache-and-network' });
  const { all, matchesCategory } = useSearchCategories();
  const { addingId, add } = useQuickAddToCart();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<ShopSort>('NAME');
  const search = useDebouncedValue(q, 350);

  // Top filter chips are SUPER categories (the top-level vibe); the matcher keeps
  // products tagged at descendant categories/subs.
  const categoryOptions = useMemo(
    () => all.filter((c) => c.level === 'SUPER').slice().sort((a, b) => a.name.localeCompare(b.name)),
    [all],
  );
  // Card badge shows the most specific category the product carries — its SUB
  // category, else category, else super.
  const categoryName = useMemo(() => {
    const map = new Map(all.map((c) => [c.id, c.name] as const));
    return (product: ShopProduct) =>
      map.get(product.sub_category_id ?? product.category_id ?? product.super_category_id ?? '') ??
      '';
  }, [all]);

  const products = useMemo(() => {
    const list: ShopProduct[] = data?.availablePodProducts ?? [];
    const term = search.trim().toLowerCase();
    const filtered = list
      .filter((product) => matchesCategory(product, categoryId))
      .filter(
        (product) =>
          !term ||
          product.product_name?.toLowerCase().includes(term) ||
          product.brand_name?.toLowerCase().includes(term),
      );
    return sortShopProducts(filtered, sort);
  }, [data, search, categoryId, sort, matchesCategory]);

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
          Pod Shop
        </Typography>
        <ShopHeaderCart />
      </Stack>
      <PodShopSlider />
      <ShopFilterBar
        q={q}
        onQueryChange={setQ}
        sort={sort}
        onSortChange={setSort}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categoryOptions={categoryOptions}
      />
      {products.length === 0 ? (
        <Alert severity="info">No products match your filters.</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Featured Products
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            {products.map((product) => (
              <ShopProductCard
                key={product.id}
                product={product}
                priceFormat={priceFormat}
                categoryLabel={categoryName(product)}
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
