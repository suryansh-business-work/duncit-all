import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { loadNotifyRecipients } from '@services/notify/notify.recipients';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';

/**
 * Tell a person about their money — on WhatsApp and by email, both from
 * templates owned by the Communications portal (WhatsApp campaigns and the
 * email catalogue), never composed here.
 *
 * Each notice is the twin pair `<WA event>` / `<email slug>`; the email lists the
 * same variables in the same order as the WhatsApp parameters, so the two never
 * drift. Sending NEVER throws: a failed message must not undo or block a payment
 * decision that has already been committed.
 */

export type MoneyOutNotice =
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_PARTIALLY_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'WITHDRAWAL_PAID'
  | 'SEND_MONEY_PAID';

const EMAIL_SLUG: Record<MoneyOutNotice, string> = {
  WITHDRAWAL_APPROVED: 'withdrawal-approved',
  WITHDRAWAL_PARTIALLY_APPROVED: 'withdrawal-partially-approved',
  WITHDRAWAL_REJECTED: 'withdrawal-rejected',
  WITHDRAWAL_PAID: 'withdrawal-paid',
  SEND_MONEY_PAID: 'send-money-paid',
};

const EMAIL_SUBJECT: Record<MoneyOutNotice, string> = {
  WITHDRAWAL_APPROVED: 'Your Duncit withdrawal was approved',
  WITHDRAWAL_PARTIALLY_APPROVED: 'Your Duncit withdrawal was partially approved',
  WITHDRAWAL_REJECTED: 'Your Duncit withdrawal was not approved',
  WITHDRAWAL_PAID: 'Your Duncit withdrawal was paid',
  SEND_MONEY_PAID: 'You have received a payment from Duncit',
};

/** The values a notice can carry; each notice reads only the ones its template names. */
export interface MoneyOutVars {
  requested?: number;
  approved?: number;
  amount?: number;
  reason?: string;
  /** Plain-language payment state, already human ("Processing"). */
  paymentStatus?: string;
  /** UTR / bank reference. */
  reference?: string;
}

export interface MoneyOutNoticeInput {
  notice: MoneyOutNotice;
  /** The record the notice is about — also what makes a repeat of it a no-op. */
  recordId: string;
  userId: string;
  name: string;
  email: string;
  vars: MoneyOutVars;
}

const orDash = (value?: string) => (value && value.trim() ? value.trim() : '-');

/** The ordered values for the WhatsApp template and the matching email vars. Pure. */
export function noticeValues(notice: MoneyOutNotice, name: string, money: (n?: number) => string, vars: MoneyOutVars) {
  const who = name.trim() || 'there';
  switch (notice) {
    case 'WITHDRAWAL_APPROVED':
      return { who, ordered: [who, money(vars.approved), orDash(vars.paymentStatus)] };
    case 'WITHDRAWAL_PARTIALLY_APPROVED':
      return { who, ordered: [who, money(vars.requested), money(vars.approved), orDash(vars.reason)] };
    case 'WITHDRAWAL_REJECTED':
      return { who, ordered: [who, money(vars.requested), orDash(vars.reason)] };
    case 'WITHDRAWAL_PAID':
      return { who, ordered: [who, money(vars.amount), orDash(vars.reference)] };
    case 'SEND_MONEY_PAID':
      return { who, ordered: [who, money(vars.amount), orDash(vars.reason), orDash(vars.reference)] };
  }
}

const EMAIL_VAR_NAMES: Record<MoneyOutNotice, readonly string[]> = {
  WITHDRAWAL_APPROVED: ['name', 'approved_amount', 'payment_status'],
  WITHDRAWAL_PARTIALLY_APPROVED: ['name', 'requested_amount', 'approved_amount', 'reason'],
  WITHDRAWAL_REJECTED: ['name', 'requested_amount', 'reason'],
  WITHDRAWAL_PAID: ['name', 'amount', 'reference'],
  SEND_MONEY_PAID: ['name', 'amount', 'reason', 'reference'],
};

export async function notifyMoneyOut(input: MoneyOutNoticeInput): Promise<void> {
  try {
    const settings = await getFinanceSettings();
    const money = (n?: number) => `${settings.currency_symbol}${(Number(n) || 0).toFixed(2)}`;
    const { who, ordered } = noticeValues(input.notice, input.name, money, input.vars);
    const users = await loadNotifyRecipients([input.userId]);
    const vars = Object.fromEntries(EMAIL_VAR_NAMES[input.notice].map((key, i) => [key, ordered[i]]));
    await Promise.all([
      input.email
        ? sendEmail({
            to: input.email,
            subject: EMAIL_SUBJECT[input.notice],
            template: EMAIL_SLUG[input.notice],
            category: 'transactional',
            vars: { ...vars, name: who },
          })
        : null,
      whatsappService.send({
        event: input.notice,
        entityId: `${input.recordId}:${input.notice}`,
        user: users.get(input.userId) ?? null,
        name: who,
        params: ordered,
      }),
    ]);
  } catch (error) {
    logs.server.error('payout', 'notifyMoneyOut', { error, notice: input.notice, record_id: input.recordId });
  }
}
