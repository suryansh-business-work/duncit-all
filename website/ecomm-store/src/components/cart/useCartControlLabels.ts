import { useMemo } from 'react';
import type { CartControlLabels } from '@duncit/utils';

import { useStoreT } from '../../i18n';

/** The store's copy for the shared cart control, naming the product in every accessible name. */
export function useCartControlLabels(name: string): CartControlLabels {
  const { t } = useStoreT();
  return useMemo(() => {
    const vars = { name };
    return {
      add: t('ecommStore.card.addNamed', { vars }),
      increase: t('ecommStore.qty.increase', { vars }),
      decrease: t('ecommStore.qty.decrease', { vars }),
      remove: t('ecommStore.cart.remove', { vars }),
      quantity: t('ecommStore.qty.group', { vars }),
      added: t('ecommStore.cartControl.added'),
      removed: t('ecommStore.cartControl.removed'),
    };
  }, [t, name]);
}
