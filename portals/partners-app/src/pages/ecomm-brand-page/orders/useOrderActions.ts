import { useCallback, useState } from 'react';
import type { DocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { Translate } from '../brand-wizard/wizard-steps';
import type { OrderAddressValues } from './order-address';
import { BOOK_ORDER_SHIPMENT, CANCEL_ORDER, REFRESH_ORDER_TRACKING, UPDATE_ORDER_ADDRESS, type OrderRow } from './orders.queries';

export type OrderAction = 'book' | 'refresh' | 'address' | 'cancel';

/** What an action sends beside the order id: the corrected ship-to, or the reason for cancelling. */
export type OrderActionInput = { address: OrderAddressValues } | { reason: string };

const ACTIONS: Record<OrderAction, { mutation: DocumentNode; resultKey: string }> = {
  book: { mutation: BOOK_ORDER_SHIPMENT, resultKey: 'brandBookProductOrderShipment' },
  refresh: { mutation: REFRESH_ORDER_TRACKING, resultKey: 'brandRefreshProductOrderTracking' },
  address: { mutation: UPDATE_ORDER_ADDRESS, resultKey: 'brandUpdateProductOrderAddress' },
  cancel: { mutation: CANCEL_ORDER, resultKey: 'brandCancelProductOrder' },
};

function successText(t: Translate, action: OrderAction): string {
  switch (action) {
    case 'book':
      return t('partners.orders.booked');
    case 'cancel':
      return t('partners.orders.cancelDone');
    case 'refresh':
      return t('partners.orders.trackingRefreshed');
    default:
      return t('partners.orders.addressSaved');
  }
}

/** Runs one order action, reports it, and hands back the updated order. */
export function useOrderActions(onUpdated: (row: OrderRow) => void) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [busy, setBusy] = useState<OrderAction | null>(null);

  const run = useCallback(
    async (action: OrderAction, id: string, input?: OrderActionInput): Promise<boolean> => {
      const { mutation, resultKey } = ACTIONS[action];
      setBusy(action);
      const done = await client
        .mutate<Record<string, OrderRow>>({ mutation, variables: { id, ...input } })
        .then(({ data }) => {
          const row = data?.[resultKey];
          // ShipRocket can stop a booking part-way without the mutation failing — the order then carries why.
          if (action === 'book' && row?.last_error) {
            notifyError(t('partners.orders.bookFailed', { vars: { error: row.last_error } }));
          } else {
            notifySuccess(successText(t, action));
          }
          if (row) onUpdated(row);
          return true;
        })
        .catch((error: unknown) => {
          notifyError(parseApiError(error));
          return false;
        });
      setBusy(null);
      return done;
    },
    [client, onUpdated, t],
  );

  return { run, busy };
}
