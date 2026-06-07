import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { notifyError, notifySuccess } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import CouponsTable from './CouponsTable';
import CouponFormDialog from './CouponFormDialog';
import { COUPONS, DELETE_COUPON, type CouponRow } from './queries';
import { PODS } from '../pods-page/queries';

export default function CouponsPage() {
  const { data, loading, error, refetch } = useQuery(COUPONS, { fetchPolicy: 'cache-and-network' });
  const { data: podsData } = useQuery(PODS, { variables: { filter: {} }, fetchPolicy: 'cache-first' });
  const [deleteCoupon] = useMutation(DELETE_COUPON);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const confirm = useConfirm();

  const coupons: CouponRow[] = data?.coupons ?? [];
  const pods = useMemo(
    () => (podsData?.pods ?? []).map((p: any) => ({ id: p.id, title: p.pod_title })),
    [podsData]
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: CouponRow) => {
    setEditing(c);
    setDialogOpen(true);
  };
  const onDelete = async (c: CouponRow) => {
    const ok = await confirm({ title: 'Delete coupon', message: `Delete coupon "${c.code}"?` });
    if (!ok) return;
    try {
      await deleteCoupon({ variables: { id: c.id } });
      notifySuccess('Coupon deleted');
      refetch();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not delete coupon');
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Coupons
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Global discount codes + per-pod offer codes. Discounts apply on the payment step.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New coupon
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <CouponsTable loading={loading} coupons={coupons} onEdit={openEdit} onDelete={onDelete} />

      <CouponFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          notifySuccess(editing ? 'Coupon updated' : 'Coupon created');
          refetch();
        }}
        initial={editing}
        pods={pods}
      />
    </Stack>
  );
}
