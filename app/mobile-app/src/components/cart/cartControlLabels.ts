import type { Translator } from '@duncit/i18n';
import type { CartControlLabels } from '@duncit/utils';

/**
 * The cart control's copy for one product or dish, so every card hands it over
 * in a single line. The keys are literal on purpose — the shipped-key gate only
 * counts literal calls.
 */
export function cartControlLabels(t: Translator['t'], name: string): CartControlLabels {
  const vars = { name };
  return {
    add: t('mweb.cartControl.add', { vars }),
    increase: t('mweb.cartControl.increase', { vars }),
    decrease: t('mweb.cartControl.decrease', { vars }),
    remove: t('mweb.cartControl.remove', { vars }),
    quantity: t('mweb.cartControl.quantity', { vars }),
    added: t('mweb.cartControl.added'),
    removed: t('mweb.cartControl.removed'),
  };
}
