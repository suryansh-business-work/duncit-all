import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import TableSkeleton from '../../components/TableSkeleton';
import ConfirmDialog from '../../components/ConfirmDialog';
import HardDeleteDialog from '../../components/HardDeleteDialog';
import { useEntityLifecycle } from '../../components/useEntityLifecycle';
import {
  APPROVE_BRAND,
  DELETE_ECOMM_BRAND,
  ECOMM_BRANDS,
  REJECT_BRAND,
  SET_BRAND_COMMISSION,
  SET_ECOMM_BRAND_ACTIVE,
  STATUSES,
} from './queries';
import EcommBrandsTable from './EcommBrandsTable';
import EcommBrandReviewDialog from './EcommBrandReviewDialog';
import EcommBrandEditDialog from './EcommBrandEditDialog';

export default function EcommBrandsPage() {
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useQuery(ECOMM_BRANDS, {
    variables: { status: status || null },
  });
  const [approve] = useMutation(APPROVE_BRAND);
  const [reject] = useMutation(REJECT_BRAND);
  const [setBrandCommission, { loading: savingCommission }] = useMutation(SET_BRAND_COMMISSION);
  const lifecycle = useEntityLifecycle(SET_ECOMM_BRAND_ACTIVE, DELETE_ECOMM_BRAND, refetch);
  const [active, setActive] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');

  const openReview = (brand: any) => {
    setActive(brand);
    setNotes('');
    setTagsText((brand.tags ?? []).join(', '));
  };
  const parseTags = () => tagsText.split(',').map((tag) => tag.trim()).filter(Boolean);
  const doApprove = async () => {
    await approve({ variables: { id: active.id, notes, tags: parseTags() } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refetch();
  };
  const doReject = async () => {
    if (!notes.trim()) return;
    await reject({ variables: { id: active.id, notes } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refetch();
  };
  const doSaveCommission = async (commissionPct: number) => {
    await setBrandCommission({
      variables: { id: active.id, product_commission_pct: commissionPct },
    });
    setActive((current: any) =>
      current ? { ...current, product_commission_pct: commissionPct } : current
    );
    refetch();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack spacing={0.25}>
          <Typography variant="h5" fontWeight={700}>E-Commerce Brands</Typography>
          <Typography variant="body2" color="text.secondary">
            Review and verify partner product brands before they go live.
          </Typography>
        </Stack>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s || 'All'}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}

      {loading && !data ? (
        <TableSkeleton columns={7} />
      ) : (
        <EcommBrandsTable
          brands={data?.ecommBrands ?? []}
          onEdit={setEditing}
          onReview={openReview}
          canHardDelete={lifecycle.canHardDelete}
          onToggleActive={lifecycle.setToggleTarget}
          onDelete={lifecycle.setDeleteTarget}
        />
      )}

      <ConfirmDialog
        open={!!lifecycle.toggleTarget}
        title={lifecycle.toggleTarget?.is_active === false ? 'Activate brand' : 'Deactivate brand'}
        message={
          lifecycle.toggleTarget?.is_active === false
            ? 'This brand and its products will be visible in the marketplace again.'
            : 'This brand and its products will be hidden from the marketplace and pod product picker. You can reactivate it anytime.'
        }
        confirmLabel={lifecycle.toggleTarget?.is_active === false ? 'Activate' : 'Deactivate'}
        confirmColor={lifecycle.toggleTarget?.is_active === false ? 'success' : 'warning'}
        loading={lifecycle.toggling}
        onClose={() => lifecycle.setToggleTarget(null)}
        onConfirm={lifecycle.confirmToggle}
      />

      <HardDeleteDialog
        open={!!lifecycle.deleteTarget}
        entityLabel="brand"
        entityName={lifecycle.deleteTarget?.brand_name ?? ''}
        loading={lifecycle.deleting}
        error={lifecycle.deleteError}
        onClose={lifecycle.closeDelete}
        onConfirm={lifecycle.confirmDelete}
      />

      <EcommBrandEditDialog
        brand={editing}
        onClose={() => setEditing(null)}
        onSaved={() => refetch()}
      />

      <EcommBrandReviewDialog
        active={active}
        notes={notes}
        setNotes={setNotes}
        tagsText={tagsText}
        setTagsText={setTagsText}
        onClose={() => setActive(null)}
        onApprove={doApprove}
        onReject={doReject}
        onSaveCommission={doSaveCommission}
        savingCommission={savingCommission}
      />
    </Box>
  );
}
