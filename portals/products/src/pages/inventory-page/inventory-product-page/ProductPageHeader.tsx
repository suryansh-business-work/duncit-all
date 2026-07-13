import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import {
  ARCHIVE_INVENTORY_PRODUCT,
  DUPLICATE_INVENTORY_PRODUCT,
  RESTORE_INVENTORY_PRODUCT,
} from './productQueries';
import { STATUS_CHIP_COLOR } from './constants';
import type { InventoryStatus } from './types';

interface ProductPageHeaderProps {
  isNew: boolean;
  product: any;
  onError: (msg: string) => void;
  onToast: (msg: string) => void;
  onRefetch: () => Promise<unknown>;
}

export default function ProductPageHeader({
  isNew,
  product,
  onError,
  onToast,
  onRefetch,
}: Readonly<ProductPageHeaderProps>) {
  const navigate = useNavigate();
  const [archiveProduct] = useMutation(ARCHIVE_INVENTORY_PRODUCT);
  const [restoreProduct] = useMutation(RESTORE_INVENTORY_PRODUCT);
  const [duplicateProduct] = useMutation(DUPLICATE_INVENTORY_PRODUCT);

  const isArchived = product?.status === 'ARCHIVED';
  const statusColor = product
    ? STATUS_CHIP_COLOR[product.status as InventoryStatus]
    : 'default';

  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      <Breadcrumbs>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/inventory')}
        >
          Inventory
        </Button>
        <Typography color="text.primary">
          {isNew ? 'Add product' : product?.product_name || 'Edit product'}
        </Typography>
      </Breadcrumbs>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            {isNew ? 'Add inventory product' : product?.product_name}
          </Typography>
          {product && (
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center">
              <Chip size="small" label={product.sku} variant="outlined" />
              <Chip size="small" label={product.status} color={statusColor} />
              {product.last_updated_by_name && (
                <Typography variant="caption" color="text.secondary">
                  Last edited by {product.last_updated_by_name} ·{' '}
                  {new Date(product.updated_at).toLocaleString()}
                </Typography>
              )}
            </Stack>
          )}
        </Box>
        {!isNew && product && (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={async () => {
                try {
                  const res = await duplicateProduct({ variables: { id: product.id } });
                  const newId = res.data?.duplicateInventoryProduct?.id;
                  if (newId) navigate(`/inventory/${newId}/edit`);
                } catch (err: any) {
                  onError(err?.message ?? 'Duplicate failed');
                }
              }}
            >
              Duplicate
            </Button>
            {isArchived ? (
              <Button
                size="small"
                color="success"
                startIcon={<UnarchiveIcon />}
                onClick={async () => {
                  try {
                    await restoreProduct({ variables: { id: product.id } });
                    onToast('Restored');
                    await onRefetch();
                  } catch (err: any) {
                    onError(err?.message ?? 'Restore failed');
                  }
                }}
              >
                Restore
              </Button>
            ) : (
              <Button
                size="small"
                color="warning"
                startIcon={<ArchiveIcon />}
                onClick={async () => {
                  try {
                    await archiveProduct({ variables: { id: product.id } });
                    onToast('Archived');
                    await onRefetch();
                  } catch (err: any) {
                    onError(err?.message ?? 'Archive failed');
                  }
                }}
              >
                Archive
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
