import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { PUBLIC_PRODUCT } from './queries';

interface Props {
  productId: string | null;
  onClose: () => void;
}

/** Product-detail dialog opened from the Pod Shop info icon — image gallery,
 * name, brand and description, fetched on demand for any signed-in user. */
export default function ProductDetailDialog({ productId, onClose }: Readonly<Props>) {
  const { data, loading, error } = useQuery(PUBLIC_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
    fetchPolicy: 'cache-first',
  });
  const product = data?.publicInventoryProduct;
  const images: string[] = product
    ? (product.images?.length ? product.images : [product.image_url].filter(Boolean))
    : [];
  const description = product?.description || product?.short_description || '';

  let body: React.ReactNode = null;
  if (loading) {
    body = (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={26} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (product) {
    body = (
      <Stack spacing={1.5}>
        {images.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
            {images.map((url) => (
              <Box
                key={url}
                component="img"
                src={url}
                alt={product.product_name}
                sx={{ width: 160, height: 160, borderRadius: 2, objectFit: 'cover', flex: '0 0 auto' }}
              />
            ))}
          </Stack>
        )}
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {product.product_name}
        </Typography>
        {product.brand_name && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <StorefrontIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              by {product.brand_name}
            </Typography>
          </Stack>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {description || 'No description provided.'}
        </Typography>
      </Stack>
    );
  }

  return (
    <Dialog open={Boolean(productId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Product details
        <IconButton aria-label="Close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>{body}</DialogContent>
    </Dialog>
  );
}
