import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useConfirm, notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from './i18n';
import CouponsTable from './CouponsTable';
import CouponFormDialog from './CouponFormDialog';
import { COUPON_PODS, COUPONS_TABLE, DELETE_COUPON, type CouponPodOption, type CouponRow } from './queries';

export default function CouponsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data: podsData } = useQuery(COUPON_PODS, { fetchPolicy: 'cache-first' });
  const [deleteCoupon] = useMutation(DELETE_COUPON);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const confirm = useConfirm();

  const pods = useMemo<CouponPodOption[]>(
    () => (podsData?.pods ?? []).map((p: any) => ({ id: p.id, title: p.pod_title })),
    [podsData]
  );

  const fetchRows = useApolloTableFetch<CouponRow>(client, COUPONS_TABLE, 'couponsTable');

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: CouponRow) => {
    setEditing(c);
    setDialogOpen(true);
  };
  const onDelete = async (c: CouponRow) => {
    const ok = await confirm({
      title: t('shell.coupons.deleteTitle'),
      message: t('shell.coupons.deleteMessage', { vars: { code: c.code } }),
    });
    if (!ok) return;
    try {
      await deleteCoupon({ variables: { id: c.id } });
      notifySuccess(t('shell.coupons.deleted'));
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message ?? t('shell.coupons.deleteFailed'));
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{
          fontWeight: 900
        }}>
          {t('shell.coupons.title')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('shell.coupons.subtitle')}
        </Typography>
      </Box>

      <CouponsTable
        tableId="admin-coupons"
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            {t('shell.coupons.newCta')}
          </DuncitButton>
        }
        onEdit={openEdit}
        onDelete={onDelete}
      />

      <CouponFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          notifySuccess(editing ? t('shell.coupons.updated') : t('shell.coupons.created'));
          refetchRef.current?.();
        }}
        initial={editing}
        pods={pods}
      />
    </Stack>
  );
}
