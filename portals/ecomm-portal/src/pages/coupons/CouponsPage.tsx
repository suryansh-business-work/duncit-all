import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { useRowDelete, useTableRefresh } from '../../components/useTableActions';
import type { Editing } from '../../components/useListEditor';
import CouponForm, { type toCouponInput } from './coupon-form';
import { DELETE_COUPON, SAVE_COUPON, STORE_COUPONS_TABLE, type StoreCoupon } from './queries';
import { useCouponColumns } from './useCouponColumns';

/** The pet store's own coupons — codes only its checkout accepts. */
export default function CouponsPage() {
  const { t } = useTranslation();
  const { refetchRef, run } = useTableRefresh();
  const removeRow = useRowDelete(DELETE_COUPON, run);
  const [editing, setEditing] = useState<Editing<StoreCoupon>>(null);
  const [save, saveState] = useMutation(SAVE_COUPON);

  const onDelete = useCallback((coupon: StoreCoupon) => removeRow(coupon.id, coupon.code), [removeRow]);
  const columns = useCouponColumns({ onEdit: setEditing, onDelete });

  const submit = async (input: ReturnType<typeof toCouponInput>) => {
    const id = editing && editing !== 'new' ? editing.id : null;
    const saved = await run(() => save({ variables: { id, input } }), t('ecommPortal.common.saved'));
    if (saved) setEditing(null);
  };

  const addButton = (
    <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>
      {t('ecommPortal.coupons.add')}
    </DuncitButton>
  );

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.coupons')} subtitle={t('ecommPortal.coupons.subtitle')} actions={addButton} />
      <StoreTable<StoreCoupon>
        tableId="ecomm-coupons"
        query={STORE_COUPONS_TABLE}
        resultKey="storeCouponsTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.coupons')}
        emptyText={t('ecommPortal.coupons.empty')}
        searchPlaceholder={t('ecommPortal.coupons.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
      {editing && (
        <CouponForm
          initial={editing === 'new' ? null : editing}
          busy={saveState.loading}
          onClose={() => setEditing(null)}
          onSubmit={submit}
        />
      )}
    </Stack>
  );
}
