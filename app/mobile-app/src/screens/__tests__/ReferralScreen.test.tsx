import { Share } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { ReferralScreen } from '@/screens/ReferralScreen';
import { useReferral } from '@/hooks/useReferral';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useReferral', () => ({ useReferral: jest.fn() }));
const mockedUse = useReferral as jest.Mock;

const api = (over: Record<string, unknown> = {}) => ({
  referral: {
    code: 'DUN-AB12CD',
    gift_description: '₹100 off your next pod',
    referred_by_name: null,
    referred: [],
  },
  isLoading: false,
  applyBusy: false,
  applyError: null,
  applyCode: jest.fn().mockResolvedValue(true),
  refetch: jest.fn(),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('ReferralScreen', () => {
  it('shows the loading state', () => {
    mockedUse.mockReturnValue(api({ referral: null, isLoading: true }));
    renderWithProviders(<ReferralScreen />);
    expect(screen.getByTestId('referral-loading')).toBeOnTheScreen();
  });

  it('shows my code, the gift, shares it and applies a friend code', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    const hookApi = api();
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<ReferralScreen />);
    expect(screen.getByTestId('referral-code')).toHaveTextContent('DUN-AB12CD');
    expect(screen.getByTestId('referral-gift')).toBeOnTheScreen();
    expect(screen.getByTestId('referral-empty')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('referral-share'));
    expect(shareSpy).toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('referral-code-input'), 'dun-friend');
    fireEvent.press(screen.getByTestId('referral-apply'));
    expect(hookApi.applyCode).toHaveBeenCalledWith('DUN-FRIEND');
    shareSpy.mockRestore();
  });

  it('swallows a cancelled share sheet', () => {
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('cancelled'));
    mockedUse.mockReturnValue(api());
    renderWithProviders(<ReferralScreen />);
    fireEvent.press(screen.getByTestId('referral-share'));
    expect(shareSpy).toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it('hides the apply box once referred, lists referrals and shows apply errors', () => {
    mockedUse.mockReturnValue(
      api({
        referral: {
          code: 'DUN-AB12CD',
          gift_description: '',
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
    expect(screen.queryByTestId('referral-code-input')).toBeNull();
    expect(screen.getByTestId('referral-row-u1')).toBeOnTheScreen();
    expect(screen.getByText('New member')).toBeOnTheScreen();

    mockedUse.mockReturnValue(api({ applyError: 'That referral code does not exist' }));
    renderWithProviders(<ReferralScreen />);
    expect(screen.getByTestId('referral-apply-error')).toBeOnTheScreen();
  });

  it('keeps Apply inert while busy or empty', () => {
    const hookApi = api({ applyBusy: true });
    mockedUse.mockReturnValue(hookApi);
    renderWithProviders(<ReferralScreen />);
    fireEvent.press(screen.getByTestId('referral-apply'));
    expect(hookApi.applyCode).not.toHaveBeenCalled();
  });
});
