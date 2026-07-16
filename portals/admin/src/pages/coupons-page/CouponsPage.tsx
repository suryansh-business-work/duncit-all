import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';
import CouponsTable from './CouponsTable';
import CouponFormDialog from './CouponFormDialog';
import { COUPONS_TABLE, DELETE_COUPON, type CouponRow } from './queries';
import { PODS } from '../pods-page/queries';

export default function CouponsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data: podsData } = useQuery(PODS, { variables: { filter: {} }, fetchPolicy: 'cache-first' });
  const [deleteCoupon] = useMutation(DELETE_COUPON);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const confirm = useConfirm();

  const pods = useMemo(
    () => (podsData?.pods ?? []).map((p: any) => ({ id: p.id, title: p.pod_title })),
    [podsData]
  );

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: COUPONS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.couponsTable.rows as CouponRow[], total: data.couponsTable.total as number };
    },
    [client],
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
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not delete coupon');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={900}>
          Coupons
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Global discount codes + per-pod offer codes. Discounts apply on the payment step.
        </Typography>
      </Box>

      <CouponsTable
        tableId="admin-coupons"
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New coupon
          </Button>
        }
        onEdit={openEdit}
        onDelete={onDelete}
      />

      <CouponFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          notifySuccess(editing ? 'Coupon updated' : 'Coupon created');
          refetchRef.current?.();
        }}
        initial={editing}
        pods={pods}
      />
    </Stack>
  );
}
