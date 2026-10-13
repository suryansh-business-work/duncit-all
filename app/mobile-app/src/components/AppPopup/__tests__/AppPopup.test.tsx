import { act, fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { AppPopup } from '@/components/AppPopup';
import { DismissAppPopupDocument } from '@/graphql/app-popup';
import { navigationRef } from '@/navigation/navigationRef';
import { graphqlRequest } from '@/services/graphql.client';
import { useAppPopupStore } from '@/stores/app-popup.store';
import { useAuthStore } from '@/stores/auth.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockDismiss = jest.fn();
let mockDismissal: { ready: boolean; dismissed: string[]; dismiss: jest.Mock };
jest.mock('@/hooks/useAppPopupDismissal', () => ({
  useAppPopupDismissal: () => mockDismissal,
}));

const mockRequest = graphqlRequest as jest.Mock;
const fetchSpy = jest.fn().mockResolvedValue(undefined);

const popup = (over: Record<string, unknown> = {}) => ({
  id: 'pop-1',
  image_url: 'https://img.example/a.jpg',
  cta_label: 'Join now',
  cta_url: '/earn',
  close_button_enabled: true,
  ...over,
});

function seed(data: unknown, token: string | null = 'tok') {
  useAppPopupStore.setState({
    data: data ? { activeAppPopup: data } : undefined,
    fetch: fetchSpy,
  } as never);
  useAuthStore.setState({ token } as never);
}

beforeEach(() => {
  mockRequest.mockReset().mockResolvedValue({});
  mockDismiss.mockReset();
  fetchSpy.mockClear();
  mockDismissal = { ready: true, dismissed: [], dismiss: mockDismiss };
  jest
    .spyOn(Linking, 'openURL')
    .mockClear()
    .mockResolvedValue(undefined as never);
  jest.spyOn(navigationRef, 'isReady').mockClear().mockReturnValue(true);
  jest
    .spyOn(navigationRef, 'navigate')
    .mockClear()
    .mockImplementation(() => undefined as never);
});

describe('AppPopup', () => {
  it('asks for the popup once there is a signed-in user', () => {
    seed(null, 'tok');
    renderWithProviders(<AppPopup />);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('app-popup')).toBeNull();
  });

  it('does not ask while signed out', () => {
    seed(popup(), null);
    renderWithProviders(<AppPopup />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('draws nothing before the stored dismissals are read, or for a dismissed id', () => {
    seed(popup());
    mockDismissal = { ready: false, dismissed: [], dismiss: mockDismiss };
    const first = renderWithProviders(<AppPopup />);
    expect(screen.queryByTestId('app-popup')).toBeNull();
    first.unmount();

    mockDismissal = { ready: true, dismissed: ['pop-1'], dismiss: mockDismiss };
    renderWithProviders(<AppPopup />);
    expect(screen.queryByTestId('app-popup')).toBeNull();
  });

  it('shows the campaign and closes it from the X, locally and on the server', () => {
    seed(popup());
    renderWithProviders(<AppPopup />);
    expect(screen.getByTestId('app-popup-cta')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-popup-close'));
    expect(mockDismiss).toHaveBeenCalledWith('pop-1');
    expect(mockRequest.mock.calls[0][0]).toBe(DismissAppPopupDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({ id: 'pop-1' });
    expect(mockRequest.mock.calls[0][2]).toEqual({ auth: true });
    expect(screen.queryByTestId('app-popup')).toBeNull();
  });

  it('closes on a backdrop tap even when the X is turned off, and shows the hint', () => {
    seed(popup({ close_button_enabled: false }));
    renderWithProviders(<AppPopup />);
    expect(screen.queryByTestId('app-popup-close')).toBeNull();
    expect(screen.getByTestId('app-popup-hint')).toBeTruthy();
    fireEvent.press(screen.getByTestId('app-popup'));
    expect(mockDismiss).toHaveBeenCalledWith('pop-1');
  });

  it('has no CTA button when the campaign has no link', () => {
    seed(popup({ cta_url: '' }));
    renderWithProviders(<AppPopup />);
    expect(screen.queryByTestId('app-popup-cta')).toBeNull();
  });

  it.each([
    ['https://duncit.example/offer', null],
    ['/post/abc', ['PostDetail', { postId: 'abc' }]],
    ['/club/jam/pod/night', ['PodDetails', { clubSlug: 'jam', podSlug: 'night' }]],
    ['/pod-requests/r1', ['PodRequestDetail', { id: 'r1' }]],
    ['/earn', ['Earn']],
  ])('CTA to %s dismisses the popup and goes there', async (url, expected) => {
    seed(popup({ cta_url: url }));
    renderWithProviders(<AppPopup />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('app-popup-cta'));
    });
    expect(mockDismiss).toHaveBeenCalledWith('pop-1');
    if (expected === null) {
      expect(Linking.openURL).toHaveBeenCalledWith(url);
      expect(navigationRef.navigate).not.toHaveBeenCalled();
    } else {
      expect((navigationRef.navigate as jest.Mock).mock.calls[0]).toEqual(expected);
    }
  });

  it('dismisses but navigates nowhere while the navigator is not ready, or for an unknown link', async () => {
    (navigationRef.isReady as jest.Mock).mockReturnValue(false);
    seed(popup({ cta_url: '/earn' }));
    const first = renderWithProviders(<AppPopup />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('app-popup-cta'));
    });
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    first.unmount();

    (navigationRef.isReady as jest.Mock).mockReturnValue(true);
    seed(popup({ cta_url: '/nowhere' }));
    renderWithProviders(<AppPopup />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('app-popup-cta'));
    });
    expect(navigationRef.navigate).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
