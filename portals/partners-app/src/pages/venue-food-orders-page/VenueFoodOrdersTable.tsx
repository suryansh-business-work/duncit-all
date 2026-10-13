import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Card, CardContent } from '@mui/material';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import FoodOrderCancelDialog from './FoodOrderCancelDialog';
import FoodOrderDetailsDialog from './FoodOrderDetailsDialog';
import { buildFoodOrderColumns, getFoodOrderRowId, type FoodOrderRowHandlers } from './food-order-columns';
import { foodOrderStatusLabel } from './food-order-labels';
import {
  SET_VENUE_FOOD_ORDER_STATUS,
  VENUE_FOOD_ORDERS_TABLE,
  type FoodOrderRow,
  type FoodOrderStatus,
} from './queries';

/** How often the board asks again, so a newly paid order shows up unprompted. */
const FOOD_ORDERS_POLL_MS = 20_000;

interface Props {
  venueId: string;
}

/** The selected venue's order board: the server-side table, its row actions and their dialogs. */
export default function VenueFoodOrdersTable({ venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const updateRowRef = useRef<((row: FoodOrderRow) => void) | null>(null);
  const [viewing, setViewing] = useState<FoodOrderRow | null>(null);
  const [cancelling, setCancelling] = useState<FoodOrderRow | null>(null);
  const [setStatus] = useMutation(SET_VENUE_FOOD_ORDER_STATUS);
  const fetchRows = useApolloTableFetch<FoodOrderRow>(
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
    async (row: FoodOrderRow, next: FoodOrderStatus) => {
      try {
        const res = await setStatus({ variables: { order_id: row.id, status: next } });
        const updated = res.data?.setVenueFoodOrderStatus;
        if (updated) updateRowRef.current?.(updated);
        notifySuccess(
          t('partners.foodOrders.advanced', { vars: { no: row.order_no, status: foodOrderStatusLabel(t, next) } }),
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
        <DuncitTable<FoodOrderRow>
          tableId="partners-app-venue-food-orders"
          ariaLabel={t('mweb.studioOptions.foodOrders')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getFoodOrderRowId}
          emptyText={t('partners.foodOrders.empty')}
          defaultSort={{ field: 'created_at', dir: 'desc' }}
          searchPlaceholder={t('partners.foodOrders.searchPlaceholder')}
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
