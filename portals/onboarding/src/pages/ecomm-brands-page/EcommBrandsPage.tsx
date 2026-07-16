import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import HardDeleteDialog from '../../components/HardDeleteDialog';
import { useEntityLifecycle } from '../../components/useEntityLifecycle';
import {
  APPROVE_BRAND,
  DELETE_ECOMM_BRAND,
  ECOMM_BRANDS_TABLE,
  REJECT_BRAND,
  SET_BRAND_COMMISSION,
  SET_ECOMM_BRAND_ACTIVE,
  type EcommBrandRow,
} from './queries';
import EcommBrandsTable from './EcommBrandsTable';
import EcommBrandReviewDialog from './EcommBrandReviewDialog';
import EcommBrandEditDialog from './EcommBrandEditDialog';

export default function EcommBrandsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const [approve] = useMutation(APPROVE_BRAND);
  const [reject] = useMutation(REJECT_BRAND);
  const [setBrandCommission, { loading: savingCommission }] = useMutation(SET_BRAND_COMMISSION);
  const lifecycle = useEntityLifecycle(SET_ECOMM_BRAND_ACTIVE, DELETE_ECOMM_BRAND, refresh);
  const [active, setActive] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');

  const fetchRows = useApolloTableFetch<EcommBrandRow>(client, ECOMM_BRANDS_TABLE, 'ecommBrandsTable');

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
    refresh();
  };
  const doReject = async () => {
    if (!notes.trim()) return;
    await reject({ variables: { id: active.id, notes } });
    setActive(null);
    setNotes('');
    setTagsText('');
    refresh();
  };
  const doSaveCommission = async (commissionPct: number) => {
    await setBrandCommission({
      variables: { id: active.id, product_commission_pct: commissionPct },
    });
    setActive((current: any) =>
      current ? { ...current, product_commission_pct: commissionPct } : current
    );
    refresh();
  };

  return (
    <Box>
      <Stack spacing={0.25} mb={2}>
        <Typography variant="h5" fontWeight={700}>E-Commerce Brands</Typography>
        <Typography variant="body2" color="text.secondary">
          Review and verify partner product brands before they go live.
        </Typography>
      </Stack>

      <EcommBrandsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={setEditing}
        onReview={openReview}
        canHardDelete={lifecycle.canHardDelete}
        onToggleActive={lifecycle.setToggleTarget}
        onDelete={lifecycle.setDeleteTarget}
      />

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
        busyLabel="Working…"
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
        onSaved={refresh}
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
