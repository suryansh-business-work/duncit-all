import { fireEvent, screen } from '@testing-library/react-native';

import { HostApplyBanner } from '@/components/host-manage/HostApplyBanner';
import { useMe } from '@/hooks/useMe';
import { useMyHostRequest } from '@/hooks/useMyHostRequest';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
let focusCb: (() => void) | undefined;
const mockAddListener = jest.fn((_event: string, cb: () => void) => {
  focusCb = cb;
  return jest.fn();
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, addListener: mockAddListener }),
}));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/hooks/useMyHostRequest', () => ({ useMyHostRequest: jest.fn() }));

const mockedMe = useMe as jest.Mock;
const mockedReq = useMyHostRequest as jest.Mock;
const refetch = jest.fn().mockResolvedValue(undefined);

const setMe = (roles: string[]) => mockedMe.mockReturnValue({ data: { me: { roles } } });
const setReq = (request: unknown) =>
  mockedReq.mockReturnValue({ request, refetch, isLoading: false });

beforeEach(() => {
  jest.clearAllMocks();
  focusCb = undefined;
});

describe('HostApplyBanner', () => {
  it('renders nothing for a non-host user', () => {
    setMe(['USER']);
    setReq(null);
    renderWithProviders(<HostApplyBanner />);
    expect(screen.queryByTestId('host-apply-banner')).toBeNull();
  });

  it('shows the Apply Now CTA for a host with no active request', () => {
    setMe(['HOST']);
    setReq(null);
    renderWithProviders(<HostApplyBanner />);
    expect(screen.getByText('Ready to Host More Experiences?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-apply-cta'));
    expect(mockNavigate).toHaveBeenCalledWith('HostApply');
  });

  it('shows a disabled Applied pill while a request is pending', () => {
    setMe(['HOST']);
    setReq({ id: 'hr1', status: 'REQUESTED' });
    renderWithProviders(<HostApplyBanner />);
    expect(screen.getByTestId('host-apply-applied')).toBeOnTheScreen();
    expect(screen.queryByTestId('host-apply-cta')).toBeNull();
  });

  it('refetches the lock on screen focus', () => {
    setMe(['HOST']);
    setReq(null);
    renderWithProviders(<HostApplyBanner />);
    expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
    focusCb?.();
    expect(refetch).toHaveBeenCalled();
  });

  it('defaults to no roles when me is unavailable', () => {
    mockedMe.mockReturnValue({ data: undefined });
    setReq(null);
    renderWithProviders(<HostApplyBanner />);
    expect(screen.queryByTestId('host-apply-banner')).toBeNull();
  });
});
