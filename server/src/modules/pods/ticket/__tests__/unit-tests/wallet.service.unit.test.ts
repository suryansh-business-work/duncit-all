const forPodAndUser = jest.fn();
const getById = jest.fn();
jest.mock('../../ticket.service', () => ({
  ticketService: {
    forPodAndUser: (...a: unknown[]) => forPodAndUser(...a),
    getById: (...a: unknown[]) => getById(...a),
  },
  dateLabel: (iso?: string | null) => (iso ? `label:${iso}` : 'Date pending'),
}));
const appleWalletConfig = jest.fn();
const googleWalletConfig = jest.fn();
jest.mock('../../wallet/wallet.config', () => ({
  appleWalletConfig: () => appleWalletConfig(),
  googleWalletConfig: () => googleWalletConfig(),
}));
jest.mock('@modules/finance/finance/finance.model', () => ({
  getFinanceSettings: jest.fn().mockResolvedValue({ business_name: 'Duncit' }),
}));
jest.mock('../../ticket.download', () => ({
  ticketPassUrl: jest.fn(async (id: string) => `https://server.test/tickets/signed-${id}/ticket.pkpass`),
  walletLogoUrl: jest.fn(async () => 'https://server.test/tickets/wallet-logo.png'),
}));
const buildApplePass = jest.fn(() => Buffer.from('pkpass'));
jest.mock('@services/ticket/apple-pass', () => ({ buildApplePass: (...a: unknown[]) => buildApplePass(...(a as [])) }));
const googleWalletSaveUrl = jest.fn(() => 'https://pay.google.com/gp/v/save/jwt');
jest.mock('@services/ticket/google-wallet', () => ({
  googleWalletSaveUrl: (...a: unknown[]) => googleWalletSaveUrl(...(a as [])),
}));
jest.mock('@services/ticket/wallet-images', () => ({ walletPassImages: jest.fn().mockResolvedValue({ 'icon.png': Buffer.from('i') }) }));

import { walletService } from '../../wallet/wallet.service';

const POD = '65f0c0ffee00000000001234';
const TICKET = '65f0c0ffee0000000000abcd';
const pub = (over: Record<string, unknown> = {}) => ({
  id: TICKET,
  pod_id: POD,
  ticket_code: 'TKT-1',
  qr_token: 'qr',
  seats: 2,
  status: 'VALID',
  pod_title: 'Sunday Pickleball',
  pod_date_time: '2026-11-26T03:30:00.000Z',
  pod_end_date_time: null,
  pod_mode: 'PHYSICAL',
  venue_name: 'Smash Arena',
  venue_address: 'Sector 62',
  meeting_platform: null,
  user_name: 'Asha',
  ...over,
});
const apple = { passTypeIdentifier: 'pass.com.duncit.test' };
const google = { issuerId: '338', account: { client_email: 'a@b', private_key: 'k' } };

describe('walletService.linksForPod', () => {
  it('returns both links for the caller\'s live ticket when both wallets are set up', async () => {
    forPodAndUser.mockResolvedValue(pub());
    appleWalletConfig.mockResolvedValue(apple);
    googleWalletConfig.mockResolvedValue(google);

    expect(await walletService.linksForPod(POD, 'user-1')).toEqual({
      apple_pass_url: `https://server.test/tickets/signed-${TICKET}/ticket.pkpass`,
      google_save_url: 'https://pay.google.com/gp/v/save/jwt',
    });
    expect(forPodAndUser).toHaveBeenCalledWith(POD, 'user-1');
    expect(googleWalletSaveUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TICKET,
        brand: 'Duncit',
        event_title: 'Sunday Pickleball',
        date_label: 'label:2026-11-26T03:30:00.000Z',
        seats: 2,
        attendee_name: 'Asha',
      }),
      google,
      'https://server.test/tickets/wallet-logo.png'
    );
  });

  it('returns only the wallet that is set up', async () => {
    forPodAndUser.mockResolvedValue(pub());
    appleWalletConfig.mockResolvedValue(null);
    googleWalletConfig.mockResolvedValue(google);
    expect(await walletService.linksForPod(POD, 'user-1')).toEqual({
      apple_pass_url: null,
      google_save_url: 'https://pay.google.com/gp/v/save/jwt',
    });

    appleWalletConfig.mockResolvedValue(apple);
    googleWalletConfig.mockResolvedValue(null);
    const appleOnly = await walletService.linksForPod(POD, 'user-1');
    expect(appleOnly.google_save_url).toBeNull();
    expect(appleOnly.apple_pass_url).toContain('/ticket.pkpass');
  });

  it('returns no links without a live ticket', async () => {
    appleWalletConfig.mockResolvedValue(apple);
    googleWalletConfig.mockResolvedValue(google);

    forPodAndUser.mockResolvedValue(null);
    expect(await walletService.linksForPod(POD, 'user-1')).toEqual({ apple_pass_url: null, google_save_url: null });
    forPodAndUser.mockResolvedValue(pub({ status: 'CANCELLED' }));
    expect(await walletService.linksForPod(POD, 'user-1')).toEqual({ apple_pass_url: null, google_save_url: null });
  });

  it('does not query anything for a malformed pod id', async () => {
    expect(await walletService.linksForPod('not-an-id', 'user-1')).toEqual({ apple_pass_url: null, google_save_url: null });
    expect(forPodAndUser).not.toHaveBeenCalled();
  });
});

describe('walletService.applePassForLink', () => {
  it('builds the pass for the ticket the link names', async () => {
    getById.mockResolvedValue(pub({ mode: 'VIRTUAL' }));
    appleWalletConfig.mockResolvedValue(apple);

    expect(await walletService.applePassForLink(TICKET)).toEqual({
      pass: Buffer.from('pkpass'),
      filename: 'ticket-TKT-1.pkpass',
    });
    expect(buildApplePass).toHaveBeenCalledWith(
      expect.objectContaining({ id: TICKET, qr_token: 'qr', brand: 'Duncit' }),
      apple,
      { 'icon.png': Buffer.from('i') }
    );
  });

  it('is null when the ticket is gone or cancelled, Apple Wallet is not set up, or the id is malformed', async () => {
    appleWalletConfig.mockResolvedValue(apple);
    getById.mockResolvedValue(null);
    expect(await walletService.applePassForLink(TICKET)).toBeNull();
    getById.mockResolvedValue(pub({ status: 'CANCELLED' }));
    expect(await walletService.applePassForLink(TICKET)).toBeNull();

    getById.mockResolvedValue(pub());
    appleWalletConfig.mockResolvedValue(null);
    expect(await walletService.applePassForLink(TICKET)).toBeNull();

    getById.mockClear();
    expect(await walletService.applePassForLink('nope')).toBeNull();
    expect(getById).not.toHaveBeenCalled();
    expect(buildApplePass).not.toHaveBeenCalled();
  });
});
