import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Card, CardContent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { foodCouponToggledMessage, parseApiError, type FoodOwnerCoupon } from '@duncit/utils';
import { DELETE_VENUE_FOOD_COUPON, SET_VENUE_FOOD_COUPON_ACTIVE, VENUE_FOOD_COUPONS_TABLE } from '../documents';
import type { VenueFoodTableProps } from '../types';
import FoodCouponDialog from './FoodCouponDialog';
import { buildFoodCouponColumns, getFoodCouponRowId, type FoodCouponRowHandlers } from './food-coupon-columns';

/** The dialog's subject: a saved coupon to edit, or `'new'`. */
type Editing = FoodOwnerCoupon | 'new' | null;

/**
 * A venue's food coupons: the server-side table, its row actions and the
 * create / edit dialog. The venue funds them and they work on that venue's
 * food orders only.
 */
export default function VenueFoodCoupons({ venueId, surface }: Readonly<VenueFoodTableProps>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const updateRowRef = useRef<((row: FoodOwnerCoupon) => void) | null>(null);
  // Coupons whose switch is still being answered. A ref, not state: feeding it
  // into the column defs would rebuild every column on each click.
  const switching = useRef(new Set<string>());
  const [editing, setEditing] = useState<Editing>(null);
  const [setActive] = useMutation(SET_VENUE_FOOD_COUPON_ACTIVE);
  const [remove] = useMutation(DELETE_VENUE_FOOD_COUPON);
  const fetchRows = useApolloTableFetch<FoodOwnerCoupon>(
    client,
    VENUE_FOOD_COUPONS_TABLE,
    'venueFoodCouponsTable',
    { extraVariables: { venue_id: venueId } },
    [venueId],
  );

  // The switch moves at once and is put back if the server refuses; a second
  // click on the same coupon waits for the first answer.
  const toggle = useCallback(
    async (row: FoodOwnerCoupon) => {
      if (switching.current.has(row.id)) return;
      switching.current.add(row.id);
      const next = !row.is_active;
      updateRowRef.current?.({ ...row, is_active: next });
      try {
        const res = await setActive({ variables: { coupon_id: row.id, is_active: next } });
        const saved = res.data?.setVenueFoodCouponActive;
        if (saved) updateRowRef.current?.(saved);
        notifySuccess(foodCouponToggledMessage(t, row.code, next));
      } catch (error) {
        updateRowRef.current?.(row);
        notifyError(parseApiError(error));
      } finally {
        switching.current.delete(row.id);
      }
    },
    [setActive, t],
  );

  const deleteCoupon = useCallback(
    async (row: FoodOwnerCoupon) => {
      const agreed = await confirm({
        title: t('venueFoodOwner.coupons.deleteTitle', { vars: { code: row.code } }),
        message: t('venueFoodOwner.coupons.deleteBody'),
        confirmLabel: t('venueFoodOwner.common.delete'),
        cancelLabel: t('venueFoodOwner.common.cancel'),
        destructive: true,
      });
      if (!agreed) return;
      try {
        await remove({ variables: { coupon_id: row.id } });
        notifySuccess(t('venueFoodOwner.coupons.deleted', { vars: { code: row.code } }));
      } catch (error) {
        notifyError(parseApiError(error));
      }
      // Either way the list is asked again: a refusal usually means the coupon is already gone.
      refetchRef.current?.();
    },
    [confirm, remove, t],
  );

  const columns = useMemo(() => {
    const handlers: FoodCouponRowHandlers = { onToggle: toggle, onEdit: setEditing, onDelete: deleteCoupon };
    return buildFoodCouponColumns(t, handlers);
  }, [t, toggle, deleteCoupon]);

  // A new coupon changes which rows the view holds, so the list is asked again; an edit repaints its own row.
  const onCreated = () => refetchRef.current?.();
  const onUpdated = (coupon: FoodOwnerCoupon) => updateRowRef.current?.(coupon);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <DuncitTable<FoodOwnerCoupon>
          tableId={`${surface}-venue-food-coupons`}
          ariaLabel={t('venueFoodOwner.coupons.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getFoodCouponRowId}
          emptyText={t('venueFoodOwner.coupons.empty')}
          defaultSort={{ field: 'created_at', dir: 'desc' }}
          searchPlaceholder={t('venueFoodOwner.coupons.searchPlaceholder')}
          refetchRef={refetchRef}
          updateRowRef={updateRowRef}
          toolbarActions={
            <DuncitButton
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setEditing('new')}
              data-testid="food-coupon-new"
            >
              {t('venueFoodOwner.coupons.newCoupon')}
            </DuncitButton>
          }
        />
      </CardContent>
      <FoodCouponDialog
        open={editing !== null}
        venueId={venueId}
        coupon={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onCreated={onCreated}
        onUpdated={onUpdated}
      />
    </Card>
  );
}
