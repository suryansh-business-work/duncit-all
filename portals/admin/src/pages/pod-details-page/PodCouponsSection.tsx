import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Button } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import SectionCard from './SectionCard';
import CouponsTable from '../coupons-page/CouponsTable';
import CouponFormDialog from '../coupons-page/CouponFormDialog';
import { COUPONS_FOR_POD_TABLE, DELETE_COUPON, type CouponRow } from '../coupons-page/queries';
import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';

interface Props {
  podId: string;
  podTitle: string;
}

/** Per-pod offer codes — server-paged list of global + pod-scoped coupons, with
 * create/edit/delete locked to this pod. Reuses the global coupons table + dialog. */
export default function PodCouponsSection({ podId, podTitle }: Readonly<Props>) {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [deleteCoupon] = useMutation(DELETE_COUPON);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const confirm = useConfirm();

  const fetchRows = useApolloTableFetch<CouponRow>(
    client,
    COUPONS_FOR_POD_TABLE,
    'couponsForPodTable',
    { extraVariables: { pod_id: podId } },
    [podId],
  );

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
    <SectionCard
      icon={<LocalOfferIcon fontSize="small" />}
      title="Offer codes"
      tone="info"
      action={
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
      }
    >
      <CouponsTable
        tableId="admin-pod-coupons"
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={(c) => {
          setEditing(c);
          setOpen(true);
        }}
        onDelete={onDelete}
      />
      <CouponFormDialog
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          notifySuccess(editing ? 'Coupon updated' : 'Coupon created');
          refetchRef.current?.();
        }}
        initial={editing}
        lockedPod={editing?.scope === 'GLOBAL' ? null : { id: podId, title: podTitle }}
        pods={[]}
      />
    </SectionCard>
  );
}
