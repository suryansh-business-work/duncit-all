import { useNavigate } from 'react-router';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

import { useCart } from '../../app/providers/CartProvider';
import {
  CANCEL_SUBSCRIPTION,
  PAUSE_SUBSCRIPTION,
  SKIP_SUBSCRIPTION,
  SUBSCRIPTION_ORDER_NOW,
  type StoreSubscription,
} from '../../graphql/autoship';
import { STORE_CART } from '../../graphql/cart';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';

/** Pause/resume, skip, order now and cancel — each tells the shopper how it went. */
export function useSubscriptionActions(subscription: StoreSubscription) {
  const { t } = useStoreT();
  const navigate = useNavigate();
  const client = useApolloClient();
  const confirm = useConfirm();
  const { cartToken } = useCart();
  const [pause] = useMutation(PAUSE_SUBSCRIPTION);
  const [skip] = useMutation(SKIP_SUBSCRIPTION);
  const [cancel] = useMutation(CANCEL_SUBSCRIPTION);
  const [orderNow] = useMutation(SUBSCRIPTION_ORDER_NOW);
  const id = subscription.id;

  const run = async (action: () => Promise<unknown>, doneKey: string) => {
    try {
      await action();
      notifySuccess(t(doneKey));
    } catch (error) {
      notifyError(parseApiError(error, t('ecommStore.autoship.failed')));
    }
  };

  return {
    togglePause: () =>
      run(
        () => pause({ variables: { id, paused: subscription.status === 'ACTIVE' } }),
        subscription.status === 'ACTIVE' ? 'ecommStore.autoship.paused' : 'ecommStore.autoship.resumed',
      ),
    skipNext: () => run(() => skip({ variables: { id } }), 'ecommStore.autoship.skipped'),
    cancelPlan: async () => {
      const ok = await confirm({
        title: t('ecommStore.autoship.cancelTitle'),
        message: t('ecommStore.autoship.cancelBody'),
        destructive: true,
        confirmLabel: t('ecommStore.autoship.cancelConfirm'),
        cancelLabel: t('ecommStore.autoship.keep'),
      });
      if (ok) await run(() => cancel({ variables: { id } }), 'ecommStore.autoship.cancelled');
    },
    orderNow: async () => {
      try {
        await orderNow({ variables: { id, cart_token: cartToken } });
        await client.refetchQueries({ include: [STORE_CART] });
        navigate(`${paths.checkout}?autoship=${encodeURIComponent(id)}`);
      } catch (error) {
        notifyError(parseApiError(error, t('ecommStore.autoship.failed')));
      }
    },
  };
}
