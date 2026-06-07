import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AddIcon from '@mui/icons-material/Add';
import CouponsTable from '../coupons-page/CouponsTable';
import CouponFormDialog from '../coupons-page/CouponFormDialog';
import { COUPONS_FOR_POD, DELETE_COUPON, type CouponRow } from '../coupons-page/queries';
import { notifyError, notifySuccess } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';

interface Props {
  podId: string;
  podTitle: string;
}

/** Per-pod offer codes — list of global + pod-scoped coupons, with create/edit/
 * delete locked to this pod. Reuses the global coupons table + dialog. */
export default function PodCouponsSection({ podId, podTitle }: Props) {
  const { data, loading, refetch } = useQuery(COUPONS_FOR_POD, {
    variables: { pod_id: podId },
    fetchPolicy: 'cache-and-network',
  });
  const [deleteCoupon] = useMutation(DELETE_COUPON);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const confirm = useConfirm();

  const coupons: CouponRow[] = data?.couponsForPod ?? [];

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
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LocalOfferIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={900}>
              Offer codes
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New offer code
          </Button>
        </Stack>
        <CouponsTable
          loading={loading}
          coupons={coupons}
          onEdit={(c) => {
            setEditing(c);
            setOpen(true);
          }}
          onDelete={onDelete}
        />
      </CardContent>
      <CouponFormDialog
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          notifySuccess(editing ? 'Coupon updated' : 'Coupon created');
          refetch();
        }}
        initial={editing}
        lockedPod={editing && editing.scope === 'GLOBAL' ? null : { id: podId, title: podTitle }}
        pods={[]}
      />
    </Card>
  );
}
