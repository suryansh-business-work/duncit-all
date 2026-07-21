import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClubCategoryChips from '../clubs-page/ClubCategoryChips';
import { scopeCategoryButtons, useSearchCategories } from '../search-page/useSearchDiscovery';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePricing } from '../../hooks/usePricing';
import ShopProductCard from './ShopProductCard';
import {
  SHOP_PRODUCTS,
  SHOP_SORT_OPTIONS,
  sortShopProducts,
  type ShopProduct,
  type ShopSort,
} from './queries';

/** Pod Shop — the platform-wide browse catalogue of approved, pod-available
 * products with category chips, debounced search and sorting. Tapping a product
 * opens its detail page; purchases happen through a pod's shop. */
export default function ShopPage() {
  const navigate = useNavigate();
  const { format: priceFormat } = usePricing();
  const { data, loading, error } = useQuery(SHOP_PRODUCTS, { fetchPolicy: 'cache-and-network' });
  const { all, buttons, matchesCategory } = useSearchCategories();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<ShopSort>('NAME');
  const search = useDebouncedValue(q, 350);

  const categoryOptions = useMemo(() => scopeCategoryButtons(buttons, all, null), [buttons, all]);

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
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
          Pod Shop
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 700 }}>
          Products you can add on when booking a pod
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' } }}
        />
        <TextField
          select
          size="small"
          label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as ShopSort)}
          sx={{ minWidth: 168 }}
        >
          {SHOP_SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <ClubCategoryChips categories={categoryOptions} selectedId={categoryId} onSelect={setCategoryId} />
      {products.length === 0 ? (
        <Alert severity="info">No products match your filters.</Alert>
      ) : (
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
              onOpen={(id) => navigate(`/product/${id}`)}
            />
          ))}
        </Box>
      )}
    </Stack>
  );
}
