import { useCallback, useState } from 'react';
import { parseApiError } from '@duncit/utils';

import { CancelMyPodShopReturnDocument } from '@/graphql/pod-shop-returns';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import type { PodShopReturn } from '@/utils/product-orders';

/**
 * "Cancel return" on My Product Orders: which return the confirm dialog is
 * asking about, the withdrawal itself, and its failure. RN twin of mWeb's
 * CancelReturnDialog (rule 27).
 */
export function useCancelPodShopReturn(onCancelled: () => void) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<PodShopReturn | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = useCallback((ret: PodShopReturn) => {
    setError('');
    setTarget(ret);
  }, []);

  const dismiss = useCallback(() => {
    if (!busy) setTarget(null);
  }, [busy]);

  const withdraw = async (ret: PodShopReturn) => {
    setBusy(true);
    try {
      await graphqlRequest(CancelMyPodShopReturnDocument, { id: ret.id }, { auth: true });
      setTarget(null);
      onCancelled();
    } catch (e) {
      setTarget(null);
      setError(parseApiError(e, t('mweb.podShopReturns.cancelFailed')));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (target) withdraw(target).catch(() => undefined);
  };

  return { target, busy, error, ask, dismiss, confirm };
}
