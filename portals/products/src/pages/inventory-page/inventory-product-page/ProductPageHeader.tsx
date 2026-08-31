import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Breadcrumbs, Chip, Stack, Typography } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { DuncitButton } from '@duncit/buttons';
import { BackButton, StatusChip } from '@duncit/ui';
import {
  ARCHIVE_INVENTORY_PRODUCT,
  DUPLICATE_INVENTORY_PRODUCT,
  RESTORE_INVENTORY_PRODUCT,
} from './productQueries';
import { productEditPath, productListLabel, productListPath } from './productPaths';
import { STATUS_CHIP_COLOR } from './constants';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface ProductPageHeaderProps {
  isNew: boolean;
  product: any;
  /** Set on the brand route so the breadcrumb and the duplicate redirect stay
   * inside `/catalog/brands/:brandId/products`. */
  brandId?: string;
  onError: (msg: string) => void;
  onToast: (msg: string) => void;
  onRefetch: () => Promise<unknown>;
}

export default function ProductPageHeader({
  isNew,
  product,
  brandId,
  onError,
  onToast,
  onRefetch,
}: Readonly<ProductPageHeaderProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [archiveProduct] = useMutation<any>(ARCHIVE_INVENTORY_PRODUCT);
  const [restoreProduct] = useMutation<any>(RESTORE_INVENTORY_PRODUCT);
  const [duplicateProduct] = useMutation<any>(DUPLICATE_INVENTORY_PRODUCT);

  const isArchived = product?.status === 'ARCHIVED';

  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      <Breadcrumbs>
        <BackButton onClick={() => navigate(productListPath(brandId))}>
          {productListLabel(brandId)}
        </BackButton>
        <Typography sx={{
          color: "text.primary"
        }}>
          {isNew ? 'Add product' : product?.product_name || 'Edit product'}
        </Typography>
      </Breadcrumbs>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
        alignItems: { md: 'center' }
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{
            fontWeight: 700
          }}>
            {isNew ? 'Add inventory product' : product?.product_name}
          </Typography>
          {product && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                mt: 0.5
              }}>
              <Chip size="small" label={product.sku} variant="outlined" />
              <StatusChip status={product.status} colorMap={STATUS_CHIP_COLOR} />
              {product.last_updated_by_name && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  Last edited by {product.last_updated_by_name} ·{' '}
                  {formatDateTime(product.updated_at)}
                </Typography>
              )}
            </Stack>
          )}
        </Box>
        {!isNew && product && (
          <Stack direction="row" spacing={1}>
            <DuncitButton
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={async () => {
                try {
                  const res = await duplicateProduct({ variables: { id: product.id } });
                  const newId = res.data?.duplicateInventoryProduct?.id;
                  if (newId) navigate(productEditPath(newId, brandId));
                } catch (err: any) {
                  onError(err?.message ?? 'Duplicate failed');
                }
              }}
            >
              Duplicate
            </DuncitButton>
            {isArchived ? (
              <DuncitButton
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
              </DuncitButton>
            ) : (
              <DuncitButton
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
                {t('products.inventory.archive')}
              </DuncitButton>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
