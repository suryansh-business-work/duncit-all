import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ListProductsForm } from './list-products';
import ProductListingsTable from './ProductListingsTable';

export default function ListProductsPage() {
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const onSaved = () => {
    setEditingProduct(null);
    setRefreshKey((key) => key + 1);
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box sx={{ p: 3, borderRadius: 4, color: '#fff', background: 'linear-gradient(145deg, #13281e 0%, #224739 55%, #111827 100%)' }}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>Product listing</Typography>
        <Typography variant="h4" fontWeight={950}>List your products</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)', mt: 1 }}>
          Sell your products via Duncit. Hosts can select approved products during pod creation.
        </Typography>
      </Box>
      <ListProductsForm product={editingProduct} onSaved={onSaved} />
      <ProductListingsTable refreshKey={refreshKey} onEdit={(product) => { setEditingProduct(product); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </Stack>
  );
}