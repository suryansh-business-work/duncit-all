import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { WalletButtons } from '@/components/checkout/WalletButtons';
import { renderWithProviders } from '@/utils/test-utils';

const mockLinks = jest.fn();
jest.mock('@/hooks/useTicketWalletLinks', () => ({
  useTicketWalletLinks: (podId: string | undefined) => mockLinks(podId),
}));

const APPLE = 'https://server.test/tickets/tok/ticket.pkpass';
const GOOGLE = 'https://pay.google.com/gp/v/save/jwt';

let openURL: jest.SpyInstance;
beforeEach(() => {
  mockLinks.mockReset();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => openURL.mockRestore());

describe('WalletButtons', () => {
  it('renders nothing while no wallet is set up', () => {
    mockLinks.mockReturnValue({ apple_pass_url: null, google_save_url: null });
    renderWithProviders(<WalletButtons podId="p1" />);

    expect(mockLinks).toHaveBeenCalledWith('p1');
    expect(screen.queryByTestId('success-pod-wallets')).toBeNull();
  });

  it('opens the signed pass and the Google save link in the system browser', () => {
    mockLinks.mockReturnValue({ apple_pass_url: APPLE, google_save_url: GOOGLE });
    renderWithProviders(<WalletButtons podId="p1" />);

    fireEvent.press(screen.getByTestId('success-pod-apple-wallet'));
    expect(openURL).toHaveBeenLastCalledWith(APPLE);
    fireEvent.press(screen.getByTestId('success-pod-google-wallet'));
    expect(openURL).toHaveBeenLastCalledWith(GOOGLE);
    expect(screen.getByLabelText('Add to Apple Wallet')).toBeOnTheScreen();
  });

  it('shows only the wallet that has a link', () => {
    mockLinks.mockReturnValue({ apple_pass_url: null, google_save_url: GOOGLE });
    renderWithProviders(<WalletButtons podId="p1" />);

    expect(screen.queryByTestId('success-pod-apple-wallet')).toBeNull();
    expect(screen.getByTestId('success-pod-google-wallet')).toBeOnTheScreen();
  });

  it('says so, and logs, when the link cannot be opened — then clears on retry', async () => {
    const logError = jest.spyOn(logs.mobileApp, 'error').mockImplementation(() => undefined);
    const failure = new Error('no browser');
    openURL.mockRejectedValueOnce(failure);
    mockLinks.mockReturnValue({ apple_pass_url: APPLE, google_save_url: null });
    renderWithProviders(<WalletButtons podId="p1" />);

    fireEvent.press(screen.getByTestId('success-pod-apple-wallet'));
    expect(await screen.findByTestId('wallet-error')).toHaveTextContent('Could not open your wallet. Please try again.');
    expect(logError).toHaveBeenCalledWith('checkout', 'openWalletLink', { error: failure });

    fireEvent.press(screen.getByTestId('success-pod-apple-wallet'));
    await waitFor(() => expect(screen.queryByTestId('wallet-error')).toBeNull());
    logError.mockRestore();
  });
});
