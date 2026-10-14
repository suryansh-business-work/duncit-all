import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Card, CardContent } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import {
  FOOD_ORDERS_POLL_MS,
  foodOrderStatusLabel,
  parseApiError,
  type FoodOwnerOrder,
  type VenueFoodOrderStatus,
} from '@duncit/utils';
import { SET_VENUE_FOOD_ORDER_STATUS, VENUE_FOOD_ORDERS_TABLE } from '../documents';
import type { VenueFoodTableProps } from '../types';
import FoodOrderCancelDialog from './FoodOrderCancelDialog';
import FoodOrderDetailsDialog from './FoodOrderDetailsDialog';
import { buildFoodOrderColumns, getFoodOrderRowId, type FoodOrderRowHandlers } from './food-order-columns';

/**
 * A venue's order board: the server-side table, its row actions and their
 * dialogs. The owner moves each paid order through the kitchen, or cancels it
 * with a full refund.
 */
export default function VenueFoodOrders({ venueId, surface }: Readonly<VenueFoodTableProps>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const updateRowRef = useRef<((row: FoodOwnerOrder) => void) | null>(null);
  const [viewing, setViewing] = useState<FoodOwnerOrder | null>(null);
  const [cancelling, setCancelling] = useState<FoodOwnerOrder | null>(null);
  const [setStatus] = useMutation(SET_VENUE_FOOD_ORDER_STATUS);
  const fetchRows = useApolloTableFetch<FoodOwnerOrder>(
    client,
    VENUE_FOOD_ORDERS_TABLE,
    'venueFoodOrdersTable',
    { extraVariables: { venue_id: venueId } },
    [venueId],
  );

  // The table reads through its own fetch bridge rather than a watched query,
  // so the refresh is its reload on a timer. Paused while a dialog is open: the
  // order being read or cancelled must not shift underneath the owner.
  const dialogOpen = viewing !== null || cancelling !== null;
  useEffect(() => {
    if (dialogOpen) return undefined;
    const timer = globalThis.setInterval(() => refetchRef.current?.(), FOOD_ORDERS_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [dialogOpen]);

  const advance = useCallback(
    async (row: FoodOwnerOrder, next: VenueFoodOrderStatus) => {
      try {
        const res = await setStatus({ variables: { order_id: row.id, status: next } });
        const updated = res.data?.setVenueFoodOrderStatus;
        if (updated) updateRowRef.current?.(updated);
        notifySuccess(
          t('venueFoodOwner.orders.advanced', { vars: { no: row.order_no, status: foodOrderStatusLabel(t, next) } }),
        );
      } catch (error) {
        notifyError(parseApiError(error));
        // A refusal usually means the order moved elsewhere (another device,
        // a cancel) — show what the server holds now.
        refetchRef.current?.();
      }
    },
    [setStatus, t],
  );

  const columns = useMemo(() => {
    const handlers: FoodOrderRowHandlers = { onAdvance: advance, onView: setViewing, onCancel: setCancelling };
    return buildFoodOrderColumns(t, handlers);
  }, [t, advance]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <DuncitTable<FoodOwnerOrder>
          tableId={`${surface}-venue-food-orders`}
          ariaLabel={t('venueFoodOwner.orders.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getFoodOrderRowId}
          emptyText={t('venueFoodOwner.orders.empty')}
          defaultSort={{ field: 'created_at', dir: 'desc' }}
          searchPlaceholder={t('venueFoodOwner.orders.searchPlaceholder')}
          refetchRef={refetchRef}
          updateRowRef={updateRowRef}
        />
      </CardContent>
      <FoodOrderDetailsDialog order={viewing} onClose={() => setViewing(null)} />
      <FoodOrderCancelDialog
        order={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={(order) => updateRowRef.current?.(order)}
      />
    </Card>
  );
}
