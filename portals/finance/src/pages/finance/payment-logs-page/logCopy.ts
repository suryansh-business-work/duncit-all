import type { Translator } from '@duncit/app-settings';
import type { PaymentShop } from './queries';

/** A log's heading and the line under it saying what the page shows — and, for a
 * shop's log, what is and is not in it. Every key is a literal so the
 * localization gate can see it rendered. */
export function logCopy(t: Translator['t'], shop?: PaymentShop): { title: string; subtitle: string } {
  if (shop === 'POD_SHOP') {
    return { title: t('finance.payment.logsTitlePodShop'), subtitle: t('finance.payment.logsSubtitlePodShop') };
  }
  if (shop === 'ECOMM') {
    return { title: t('finance.payment.logsTitleEcomm'), subtitle: t('finance.payment.logsSubtitleEcomm') };
  }
  return { title: t('finance.payment.logsTitle'), subtitle: t('finance.payment.logsSubtitle') };
}
