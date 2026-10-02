import { Linking, Switch } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { ConsentHost, ConsentSheet } from '@/components/consent';
import { useConsentSync } from '@/hooks/useConsentSync';
import { useAuthStore } from '@/stores/auth.store';
import { useConsentStore } from '@/stores/consent.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/hooks/useConsentSync', () => ({ useConsentSync: jest.fn() }));
jest.mock('@/constants/config', () => ({
  config: { apiUrl: 'https://server.duncit.com', mainSiteUrl: 'https://duncit.com' },
}));

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
const mockedSync = useConsentSync as jest.Mock;

const undecided = () => useConsentStore.setState({ hydrated: true, choice: null });
const saved = () => useConsentStore.getState().choice;

beforeEach(() => {
  jest.clearAllMocks();
  undecided();
});

describe('ConsentSheet', () => {
  it('stays closed until the stored choice has been read', () => {
    useConsentStore.setState({ hydrated: false, choice: null });
    renderWithProviders(<ConsentSheet />);
    expect(screen.queryByTestId('consent-accept-all')).toBeNull();
  });

  it('stays closed once the device has answered', () => {
    useConsentStore.setState({
      hydrated: true,
      choice: { analytics: false, marketing: false, decided_at: '2026-10-01T00:00:00.000Z' },
    });
    renderWithProviders(<ConsentSheet />);
    expect(screen.queryByTestId('consent-accept-all')).toBeNull();
  });

  it('accepts everything', () => {
    renderWithProviders(<ConsentSheet />);
    expect(screen.getByText('Your privacy')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('consent-accept-all'));
    expect(saved()).toMatchObject({ analytics: true, marketing: true });
  });

  it('rejects everything with the same one tap', () => {
    renderWithProviders(<ConsentSheet />);
    fireEvent.press(screen.getByTestId('consent-reject-all'));
    expect(saved()).toMatchObject({ analytics: false, marketing: false });
  });

  it('opens the privacy policy on the main site', () => {
    renderWithProviders(<ConsentSheet />);
    fireEvent.press(screen.getByTestId('consent-policy-link'));
    expect(openURL).toHaveBeenCalledWith('https://duncit.com/policies');
  });

  it('is not dismissed by Back or the escape gesture', () => {
    renderWithProviders(<ConsentSheet />);
    act(() => {
      screen.getByTestId('consent-banner').props.onAccessibilityEscape();
    });
    expect(screen.getByTestId('consent-accept-all')).toBeOnTheScreen();
    expect(saved()).toBeNull();
  });

  it('saves a custom choice, with both optional switches starting off', () => {
    renderWithProviders(<ConsentSheet />);
    expect(screen.queryByTestId('consent-switch-analytics')).toBeNull();
    fireEvent.press(screen.getByTestId('consent-customise'));

    expect(screen.getByTestId('consent-switch-essential-switch').props.value).toBe(true);
    expect(screen.getByTestId('consent-switch-analytics-switch').props.value).toBe(false);
    // The essential switch is locked on: its handler changes nothing. The host
    // element carries no handler, so reach the Switch component's own props.
    const [essential] = screen.UNSAFE_getAllByType(Switch);
    expect(essential?.props.disabled).toBe(true);
    act(() => {
      essential?.props.onValueChange(false);
    });
    fireEvent(screen.getByTestId('consent-switch-analytics-switch'), 'valueChange', true);
    fireEvent(screen.getByTestId('consent-switch-marketing-switch'), 'valueChange', true);
    fireEvent(screen.getByTestId('consent-switch-marketing-switch'), 'valueChange', false);
    fireEvent.press(screen.getByTestId('consent-save'));
    expect(saved()).toMatchObject({ analytics: true, marketing: false });
  });
});

describe('ConsentHost', () => {
  it('syncs as signed out without a session, and signed in with one', () => {
    useAuthStore.setState({ token: null });
    const { rerender } = renderWithProviders(<ConsentHost />);
    expect(mockedSync).toHaveBeenLastCalledWith(false);
    act(() => {
      useAuthStore.setState({ token: 'tok-1' });
    });
    rerender(<ConsentHost />);
    expect(mockedSync).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('consent-accept-all')).toBeOnTheScreen();
  });
});
