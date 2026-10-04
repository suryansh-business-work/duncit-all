import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ReferralScreen } from '@/screens/ReferralScreen';
import { useReferral } from '@/hooks/useReferral';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useReferral', () => ({ useReferral: jest.fn() }));
// The tracked-link round trip is useShareUrl's own concern; here it resolves to
// a fixed tracked URL so the share message and copied link can be asserted.
const TRACKED = 'https://duncit.com/s/abc';
jest.mock('@/hooks/useShareUrl', () => ({ useShareUrl: () => 'https://duncit.com/s/abc' }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
const mockedUse = useReferral as jest.Mock;
const mockedCopy = Clipboard.setStringAsync as jest.Mock;

const api = (over: Record<string, unknown> = {}) => ({
  referral: {
    code: 'DUN-AB12CD',
    gift_description: '₹100 off your next pod',
    coins_per_referral: 50,
    share_message: 'Use {code} at {link} for {coins} coins',
    referred_by_name: null,
    referred: [],
  },
  isLoading: false,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedCopy.mockResolvedValue(true);
});

describe('ReferralScreen', () => {
  it('shows the loading state', () => {
    mockedUse.mockReturnValue(api({ referral: null, isLoading: true }));
    renderWithProviders(<ReferralScreen />);
    expect(screen.getByTestId('referral-loading')).toBeOnTheScreen();
  });

  it('shows my code, the gift and the coins, and shares the rendered message', () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    mockedUse.mockReturnValue(api());
    renderWithProviders(<ReferralScreen />);
    expect(screen.getByTestId('referral-code')).toHaveTextContent('DUN-AB12CD');
    expect(screen.getByTestId('referral-gift')).toHaveTextContent('₹100 off your next pod');
    expect(screen.getByTestId('referral-coins')).toBeOnTheScreen();
    expect(screen.getByTestId('referral-empty')).toBeOnTheScreen();
    // The friend-code box is gone: a code is redeemed only at signup.
    expect(screen.queryByTestId('referral-code-input')).toBeNull();

    fireEvent.press(screen.getByTestId('referral-share'));
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: `Use DUN-AB12CD at ${TRACKED} for 50 coins` }),
    );
    shareSpy.mockRestore();
  });

  it('swallows a cancelled share sheet', () => {
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('cancelled'));
    mockedUse.mockReturnValue(api());
    renderWithProviders(<ReferralScreen />);
    fireEvent.press(screen.getByTestId('referral-share'));
    expect(shareSpy).toHaveBeenCalled();
    expect(screen.getByTestId('referral-screen')).toBeOnTheScreen();
    shareSpy.mockRestore();
  });

  it('copies the code and the tracked link, flashing a notice that clears itself', async () => {
    jest.useFakeTimers();
    try {
      mockedUse.mockReturnValue(api());
      renderWithProviders(<ReferralScreen />);
      expect(screen.queryByTestId('referral-notice')).toBeNull();

      fireEvent.press(screen.getByTestId('referral-copy-code'));
      expect(mockedCopy).toHaveBeenCalledWith('DUN-AB12CD');
      await waitFor(() => expect(screen.getByTestId('referral-notice')).toBeOnTheScreen());

      fireEvent.press(screen.getByTestId('referral-copy-link'));
      expect(mockedCopy).toHaveBeenLastCalledWith(TRACKED);

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByTestId('referral-notice')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows no notice when the clipboard write fails', async () => {
    mockedCopy.mockRejectedValue(new Error('denied'));
    mockedUse.mockReturnValue(api());
    renderWithProviders(<ReferralScreen />);
    fireEvent.press(screen.getByTestId('referral-copy-code'));
    await waitFor(() => expect(mockedCopy).toHaveBeenCalled());
    expect(screen.queryByTestId('referral-notice')).toBeNull();
  });

  it('shows who referred me and lists my referrals, naming unnamed ones', () => {
    mockedUse.mockReturnValue(
      api({
        referral: {
          code: 'DUN-AB12CD',
          gift_description: '',
          coins_per_referral: 0,
          share_message: '',
          referred_by_name: 'Asha',
          referred: [
            { user_id: 'u1', full_name: 'Ravi', referred_at: '2026-06-10T10:00:00Z' },
            { user_id: 'u2', full_name: null, referred_at: '2026-06-11T10:00:00Z' },
          ],
        },
      }),
    );
    renderWithProviders(<ReferralScreen />);
    expect(screen.getByTestId('referral-referred-by')).toBeOnTheScreen();
    expect(screen.queryByTestId('referral-gift')).toBeNull();
    expect(screen.queryByTestId('referral-coins')).toBeNull();
    expect(screen.queryByTestId('referral-empty')).toBeNull();
    expect(screen.getByTestId('referral-row-u1')).toHaveTextContent(/Ravi/);
    expect(screen.getByTestId('referral-row-u2')).toBeOnTheScreen();
    expect(screen.getByText('New member')).toBeOnTheScreen();
  });

  it('renders the empty list without a code card when the referral failed to load', () => {
    mockedUse.mockReturnValue(api({ referral: null, isLoading: false }));
    renderWithProviders(<ReferralScreen />);
    expect(screen.queryByTestId('referral-code')).toBeNull();
    expect(screen.queryByTestId('referral-share')).toBeNull();
    expect(screen.getByTestId('referral-empty')).toBeOnTheScreen();
  });
});
