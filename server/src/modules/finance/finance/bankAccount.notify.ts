import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { loadNotifyRecipients, type AccountId } from '@services/notify/notify.recipients';
import { maskAccountNumber, maskUpiId } from '@modules/finance/wallet/walletStatement.service';
import { appDateTime } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';
import { normalizeBankAccountInput, type IBankAccountVerification } from './bankAccount';

type BankLike = Partial<IBankAccountVerification> | null | undefined;

/** True when the place payouts are sent to moved: method, account, IFSC or UPI. */
export function bankAccountChanged(before: BankLike, after: BankLike): boolean {
  const a = normalizeBankAccountInput(before ?? {});
  const b = normalizeBankAccountInput(after ?? {});
  return (
    a.payout_method !== b.payout_method ||
    a.account_number !== b.account_number ||
    a.ifsc_code !== b.ifsc_code ||
    a.upi_id !== b.upi_id
  );
}

/** The new destination, masked the way the wallet statement already prints it. */
function maskedDestination(account: BankLike): string {
  const bank = normalizeBankAccountInput(account ?? {});
  return bank.payout_method === 'UPI' ? maskUpiId(bank.upi_id) : maskAccountNumber(bank.account_number);
}

/** Who gets paid through this record. */
export type BankAudience = 'HOST' | 'VENUE';

/**
 * Tell a partner the account their payouts go to was changed.
 *
 * Bank details decide where real money lands, and changing them used to be
 * silent: somebody with access to a partner's console could redirect every
 * future payout and the partner would learn only when one never arrived. This
 * is the alarm, on both channels, naming only the masked new destination.
 *
 * Only for a record that is already paying out (approved); filling the details
 * in for the first time during onboarding is not news. Never throws.
 */
export async function alertBankAccountChanged(input: {
  audience: BankAudience;
  recordId: string;
  userId: AccountId;
  name: string;
  email: string;
  account: BankLike;
}): Promise<void> {
  try {
    const destination = maskedDestination(input.account) || '-';
    const name = input.name.trim() || 'there';
    const [users, { websiteUrl }] = await Promise.all([loadNotifyRecipients([input.userId]), getUrlConfigs()]);
    const contactUrl = `${trimTrailingSlash(websiteUrl)}/contact`;
    const changedAt = new Date();
    await Promise.all([
      input.email
        ? sendEmail({
            to: input.email,
            subject: 'Your Duncit payout details were changed',
            template: 'bank-details-changed',
            category: 'transactional',
            vars: { name, account: destination, when: appDateTime(changedAt), contact_url: contactUrl },
          })
        : null,
      whatsappService.send({
        event: input.audience === 'HOST' ? 'HOST_BANK_DETAILS_CHANGED' : 'VENUE_BANK_DETAILS_CHANGED',
        entityId: `${input.recordId}:${changedAt.getTime()}`,
        user: users.get(input.userId ? input.userId.toString() : '') ?? null,
        name,
        params: [name, destination, contactUrl],
      }),
    ]);
  } catch (error) {
    logs.server.error('bankAccount', 'alertBankAccountChanged', { error, record_id: input.recordId });
  }
}
