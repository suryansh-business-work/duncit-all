const send = jest.fn();
const sendEmail = jest.fn();

jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({ whatsappService: { send: (...a: unknown[]) => send(...a) } }));
jest.mock('@services/email/email.service', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
jest.mock('@services/notify/notify.recipients', () => ({
  loadNotifyRecipients: jest.fn().mockResolvedValue(new Map([['u1', { id: 'u1', phone: '+919999999999' }]])),
}));
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn().mockResolvedValue({ currency_symbol: 'Rs ' }) }));

import { WA_EVENT_BY_KEY } from '@modules/platform/whatsapp/whatsapp.events.generated';
import { EMAIL_CATALOGUE } from '@services/email/catalogue';
import { notifyMoneyOut, noticeValues, type MoneyOutNotice } from '../../payout.notify';

const money = (n?: number) => `Rs ${(Number(n) || 0).toFixed(2)}`;

describe('noticeValues', () => {
  it('orders a partial approval as name, requested, approved, reason', () => {
    expect(noticeValues('WITHDRAWAL_PARTIALLY_APPROVED', 'Meera', money, { requested: 2500, approved: 1800, reason: 'On hold' }).ordered).toEqual([
      'Meera',
      'Rs 2500.00',
      'Rs 1800.00',
      'On hold',
    ]);
  });

  it('greets by "there" when the name is blank and dashes a missing reason', () => {
    const { who, ordered } = noticeValues('WITHDRAWAL_REJECTED', '  ', money, { requested: 100 });
    expect(who).toBe('there');
    expect(ordered).toEqual(['there', 'Rs 100.00', '-']);
  });
});

describe('the WhatsApp registry and the email catalogue agree, notice by notice', () => {
  const notices: MoneyOutNotice[] = [
    'WITHDRAWAL_APPROVED',
    'WITHDRAWAL_PARTIALLY_APPROVED',
    'WITHDRAWAL_REJECTED',
    'WITHDRAWAL_PAID',
    'SEND_MONEY_PAID',
  ];

  it.each(notices)('%s has a WhatsApp event whose arity equals the values it sends', (notice) => {
    const event = WA_EVENT_BY_KEY.get(notice);
    expect(event).toBeDefined();
    const { ordered } = noticeValues(notice, 'Meera', money, { requested: 1, approved: 1, amount: 1, reason: 'r', reference: 'ref', paymentStatus: 'Processing' });
    expect(event?.params).toHaveLength(ordered.length);
  });

  it.each(notices)('%s has an email twin whose variables follow the WhatsApp parameter order', (notice) => {
    const email = EMAIL_CATALOGUE.find((e) => e.waEvent === notice);
    expect(email).toBeDefined();
    expect(email?.vars).toHaveLength(WA_EVENT_BY_KEY.get(notice)?.params.length ?? -1);
  });
});

describe('notifyMoneyOut', () => {
  const input = {
    notice: 'WITHDRAWAL_PAID' as const,
    recordId: 'wd_1',
    userId: 'u1',
    name: 'Meera',
    email: 'meera@example.com',
    vars: { amount: 2500, reference: 'UTR1' },
  };

  it('sends the email and the WhatsApp message with the same values, keyed by record and notice', async () => {
    await notifyMoneyOut(input);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'meera@example.com',
        template: 'withdrawal-paid',
        vars: expect.objectContaining({ name: 'Meera', amount: 'Rs 2500.00', reference: 'UTR1' }),
      })
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'WITHDRAWAL_PAID', entityId: 'wd_1:WITHDRAWAL_PAID', params: ['Meera', 'Rs 2500.00', 'UTR1'] })
    );
  });

  it('skips the email, not the WhatsApp message, when there is no address', async () => {
    await notifyMoneyOut({ ...input, email: '' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never throws when a channel fails, so a decision already committed is not undone', async () => {
    sendEmail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(notifyMoneyOut(input)).resolves.toBeUndefined();
  });
});
