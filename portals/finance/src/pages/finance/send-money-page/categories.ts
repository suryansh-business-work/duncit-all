import type { useTranslation } from '@duncit/app-settings';
import { SEND_MONEY_CATEGORIES, type SendMoneyCategory, type TransferStatus } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Written as literal keys because the Shared Gates check greps source for
 * `t('key')` — a key composed at run time would look unused and fail it.
 */
export const categoryLabel = (t: Translate, category: SendMoneyCategory): string =>
  ({
    SALARY: t('finance.payouts.categorySalary'),
    REFUND: t('finance.payouts.categoryRefund'),
    REIMBURSEMENT: t('finance.payouts.categoryReimbursement'),
    ADJUSTMENT: t('finance.payouts.categoryAdjustment'),
    OTHER: t('finance.payouts.categoryOther'),
  })[category];

export const categoryOptions = (t: Translate, categories: readonly SendMoneyCategory[] = SEND_MONEY_CATEGORIES) =>
  categories.map((value) => ({ value, label: categoryLabel(t, value) }));

export const transferStatusLabel = (t: Translate, status: TransferStatus): string =>
  ({
    PENDING: t('finance.common.pending'),
    APPROVED: t('finance.payouts.statusApproved'),
    REJECTED: t('finance.common.rejected'),
    PROCESSING: t('finance.payouts.statusProcessing'),
    PAID: t('finance.withdrawals.paid'),
    FAILED: t('finance.payouts.statusFailed'),
  })[status];
