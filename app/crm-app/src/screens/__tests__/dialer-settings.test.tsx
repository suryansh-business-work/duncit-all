import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { useAuthStore } from '@/stores/auth.store';
import { useFeaturesStore } from '@/stores/features.store';
import { DialerScreen } from '../dialer/DialerScreen';
import { SettingsScreen } from '../settings/SettingsScreen';

const mockPhone = {
  lookupNumber: jest.fn(),
  placeCall: jest.fn(),
  canPinShortcut: jest.fn(),
  pinDialerShortcut: jest.fn(),
  canDrawOverlays: jest.fn(() => true),
  setFeatures: jest.fn(),
};
/** The native call module: present on Android, null on an iPhone. */
let mockPhoneModule: typeof mockPhone | null = mockPhone;
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhoneModule;
  },
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  setOptions: jest.fn(),
};
let mockRouteParams: Record<string, unknown> | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

const request = gqlRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPhoneModule = mockPhone;
  mockRouteParams = undefined;
});

describe('DialerScreen', () => {
  it('builds the number from the keypad and shows the CRM contact it belongs to', async () => {
    mockPhone.lookupNumber.mockResolvedValue({
      entityType: 'HOST_LEAD',
      leadId: 'h1',
      leadName: 'Run Club',
      contactName: 'Rohit',
      others: 0,
    });
    renderWithTheme(<DialerScreen />);
    for (const key of '9811000001') fireEvent.press(screen.getByTestId(`key-${key}`));
    expect(screen.getByTestId('dialer-number').props.value).toBe('9811000001');
    expect(await screen.findByText('Run Club', {}, { timeout: 2000 })).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dialer-open-lead'));
    expect(mockNav.navigate).toHaveBeenCalledWith('LeadDetail', { kind: 'HOST_LEAD', id: 'h1' });
    // A CRM contact can be called on the recorded CRM call line instead.
    fireEvent.press(screen.getByTestId('dialer-recorded-call'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Call', {
      kind: 'HOST_LEAD',
      id: 'h1',
      to: '9811000001',
      leadName: 'Run Club',
      contactName: 'Rohit',
    });
  });

  it('asks the server when the number is not in the phone’s directory, and says when nobody has it', async () => {
    mockPhone.lookupNumber.mockResolvedValue(null);
    request.mockResolvedValue({ crmPhoneLookup: { phone_key: '9000000000', matches: [] } });
    mockRouteParams = { number: 'tel:+91 90000 00000' };
    renderWithTheme(<DialerScreen />);
    expect(await screen.findByText('Not in Duncit CRM', {}, { timeout: 2000 })).toBeOnTheScreen();
  });

  it('places a normal call, and explains when the phone dialer opened instead', async () => {
    mockPhone.lookupNumber.mockResolvedValue(null);
    request.mockResolvedValue({ crmPhoneLookup: { phone_key: '', matches: [] } });
    mockPhone.placeCall.mockReturnValue(false);
    mockRouteParams = { number: '9811000001' };
    renderWithTheme(<DialerScreen />);
    await act(async () => fireEvent.press(screen.getByTestId('dialer-call')));
    expect(mockPhone.placeCall).toHaveBeenCalledWith('9811000001');
    expect(screen.getByText(/dialer opened/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dialer-backspace'));
    expect(screen.getByTestId('dialer-number').props.value).toBe('981100000');
  });
});

describe('SettingsScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        user_id: 'u1',
        first_name: 'Asha',
        last_name: 'Rao',
        email: 'asha@duncit.com',
        roles: ['CRM_MANAGER'],
      },
    });
    useFeaturesStore.setState({ callerId: true, autoLog: true, recordings: true, hydrated: true });
  });

  it('shows the account and switches a call feature off', async () => {
    renderWithTheme(<SettingsScreen />);
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    await act(async () =>
      fireEvent(screen.getByTestId('feature-caller-id'), 'onCheckedChange', false),
    );
    expect(useFeaturesStore.getState().callerId).toBe(false);
    expect(mockPhone.setFeatures).toHaveBeenLastCalledWith(false, true);
  });

  it('puts the dialer icon on the home screen, or explains why it cannot', () => {
    mockPhone.canPinShortcut.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockPhone.pinDialerShortcut.mockReturnValue(true);
    renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-pin-dialer'));
    expect(mockPhone.pinDialerShortcut).toHaveBeenCalledWith('Dialer');
    expect(screen.getByText('Confirm on your home screen to add the icon.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('settings-pin-dialer'));
    expect(screen.getByText(/cannot add icons from apps/)).toBeOnTheScreen();
  });

  it('on an iPhone keeps the account and the CRM call line, and leaves out the Android call features', () => {
    mockPhoneModule = null;
    renderWithTheme(<SettingsScreen />);
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-sign-out')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-call-line')).toBeOnTheScreen();
    expect(screen.queryByTestId('feature-caller-id')).toBeNull();
    expect(screen.queryByTestId('feature-auto-log')).toBeNull();
    expect(screen.queryByTestId('settings-pin-dialer')).toBeNull();
    expect(screen.queryByTestId('perm-phone')).toBeNull();
    expect(screen.queryByTestId('perm-phone-ok')).toBeNull();
    expect(screen.queryByTestId('settings-sync')).toBeNull();
  });

  it('signs out', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ signOut });
    renderWithTheme(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-sign-out'));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
