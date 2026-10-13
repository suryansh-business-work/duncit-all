import { useCallback } from 'react';
import type { CartControlLabels } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The copy `CartQuantityControl` and its notice need, for one named product or
 * dish. Every card in mWeb — pod shop, product page, cart line, venue menu —
 * takes it from here, so the control reads the same wherever it sits.
 */
export function useCartControlLabels(): (name: string) => CartControlLabels {
  const { t } = useTranslation();
  return useCallback(
    (name: string) => ({
      add: t('mweb.cartControl.add', { vars: { name } }),
      increase: t('mweb.cartControl.increase', { vars: { name } }),
      decrease: t('mweb.cartControl.decrease', { vars: { name } }),
      remove: t('mweb.cartControl.remove', { vars: { name } }),
      quantity: t('mweb.cartControl.quantity', { vars: { name } }),
      added: t('mweb.cartControl.added'),
      removed: t('mweb.cartControl.removed'),
    }),
    [t],
  );
}
