import { createTranslator } from '@duncit/i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { downloadText } from '../../../../lib/csv';
import { exportGuestsCsv } from '../../../../pages/manage/guests/exportCsv';
import { registrationFixture, typed } from '../../../test-utils';

vi.mock('../../../../lib/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/csv')>()),
  downloadText: vi.fn(),
}));

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

const HEADER = 'Name,Email,Ticket,Quantity,Status,Payment,Payment reference,Checked in,Code,Registered';

describe('exportGuestsCsv', () => {
  afterEach(() => {
    vi.mocked(downloadText).mockReset();
  });

  it('downloads <slug>-guests.csv with the column names in the host language', () => {
    exportGuestsCsv([], 'garden-party', t);

    expect(downloadText).toHaveBeenCalledTimes(1);
    expect(downloadText).toHaveBeenCalledWith('garden-party-guests.csv', HEADER);
  });

  it('writes one row per guest with translated status and payment, and blanks for what is missing', () => {
    const confirmed = registrationFixture({ code: 'ABC123', quantity: 2, checked_in_at: '2026-11-21T14:00:00.000Z' });
    const pending = registrationFixture({
      id: 'reg-2',
      code: 'XYZ789',
      status: 'PAYMENT_PENDING',
      payment_status: 'PENDING',
      payment_reference: 'UTR 4455',
      ticket: typed('LiteRegistrationTicket', { id: 'tk-2', name: 'VIP', price: 500 }),
      user: typed('LiteRegistrationUser', { id: 'u-3', name: 'Meera, Jr.', email: 'meera@example.com', phone: null, handle: 'meera', avatar_url: null }),
    });

    exportGuestsCsv([confirmed, pending], 'garden-party', t);

    const [, text] = vi.mocked(downloadText).mock.calls[0];
    expect(text.split('\r\n')).toEqual([
      HEADER,
      'Ravi Kumar,ravi@example.com,General,2,Going,Free,,2026-11-21T14:00:00.000Z,ABC123,2026-10-02T00:00:00.000Z',
      '"Meera, Jr.",meera@example.com,VIP,1,Payment pending,Awaiting payment,UTR 4455,,XYZ789,2026-10-02T00:00:00.000Z',
    ]);
  });
});
