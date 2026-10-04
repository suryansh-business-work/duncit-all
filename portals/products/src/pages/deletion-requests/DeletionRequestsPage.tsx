import { useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import DeletionReviewDialog from './DeletionReviewDialog';
import { deletionColumns } from './deletionColumns';
import { CATALOG_DELETION_TABLE, type DeletionKind, type DeletionRequestRow } from './queries';

const getRowId = (row: DeletionRequestRow) => row.id;

/**
 * Products › Delete Requests › Product / Brand Deletion Requests.
 *
 * Opening a BRAND request drills into the product requests raised under it
 * (`?parent=<id>&brand=<name>`), so the team sees exactly which products go
 * with the brand; any request opens its review dialog from the product list.
 */
export default function DeletionRequestsPage({ kind }: Readonly<{ kind: DeletionKind }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const formatter = useDateFormat();
  const [params] = useSearchParams();
  const parentId = kind === 'PRODUCT' ? params.get('parent') : null;
  const brandLabel = params.get('brand') ?? '';
  const refetchRef = useRef<(() => void) | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<DeletionRequestRow>(
    client,
    CATALOG_DELETION_TABLE,
    'catalogDeletionRequestsTable',
    { extraVariables: { kind, parent_id: parentId } },
    [kind, parentId],
  );
  const columns = useMemo(() => deletionColumns(kind, t, formatter), [kind, t, formatter]);
  const prefix = kind === 'BRAND' ? 'products.deletionRequests.brands' : 'products.deletionRequests.products';

  const onRow = (row: DeletionRequestRow) => {
    if (kind === 'BRAND') {
      const q = new URLSearchParams({ parent: row.id, brand: row.brand_name, review: row.id });
      navigate(`/deletion-requests/products?${q.toString()}`);
    } else {
      setReviewId(row.id);
    }
  };
  // A brand drill-down arrives with the brand request to review.
  const brandReview = kind === 'PRODUCT' ? params.get('review') : null;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          {t(`${prefix}.title`)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t(`${prefix}.description`)}
        </Typography>
      </Box>
      {parentId && (
        <Alert
          severity="info"
          action={
            brandReview ? (
              <Chip
                clickable
                color="primary"
                label={t('products.deletionRequests.reviewBrand')}
                onClick={() => setReviewId(brandReview)}
              />
            ) : undefined
          }
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{t('products.deletionRequests.brandFilter', { vars: { brand: brandLabel } })}</span>
            <Chip size="small" label={t('products.deletionRequests.clearFilter')} onDelete={() => navigate('/deletion-requests/products')} />
          </Stack>
        </Alert>
      )}
      <DuncitTable<DeletionRequestRow>
        ariaLabel={t(`${prefix}.title`)}
        tableId={`products-deletion-${kind.toLowerCase()}`}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={onRow}
        emptyText={t(`${prefix}.empty`)}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('products.deletionRequests.search')}
        refetchRef={refetchRef}
      />
      <DeletionReviewDialog
        requestId={reviewId}
        onClose={() => setReviewId(null)}
        onReviewed={() => refetchRef.current?.()}
      />
    </Stack>
  );
}
