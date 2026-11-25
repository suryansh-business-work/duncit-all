import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { readPermissions, requestPermission } from '@/services/permissions';
import { renderWithTheme } from '@/test-utils';
import { DialerScreen } from '../DialerScreen';
import { callKind } from '../RecentCrmCalls';

const mockPhone = {
  lookupNumber: jest.fn(),
  placeCall: jest.fn(),
  playDialTone: jest.fn(() => true),
  recentCrmCalls: jest.fn(),
  searchDirectory: jest.fn(),
};
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhone;
  },
  CALL_TYPE: { INCOMING: 1, OUTGOING: 2, MISSED: 3, VOICEMAIL: 4, REJECTED: 5, BLOCKED: 6 },
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/permissions', () => ({
  hasPhoneFeatures: () => true,
  readPermissions: jest.fn(),
  requestPermission: jest.fn(),
}));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: undefined }),
}));

/** The redesigned dialer: its three tabs, the CRM match card, the bottom actions and the keys. */

const lead = {
  entityType: 'HOST_LEAD',
  leadId: 'h1',
  leadName: 'Apoorva Srivastava',
  contactName: 'Apoorva',
  status: 'Interested',
  assignee: 'Suryansh',
  others: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  (readPermissions as jest.Mock).mockResolvedValue({ phone: true });
  (requestPermission as jest.Mock).mockResolvedValue(undefined);
  mockPhone.lookupNumber.mockResolvedValue(null);
});

async function typeNumber(digits: string) {
  for (const key of digits) fireEvent.press(screen.getByTestId(`key-${key}`));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
}

it('shows the matched lead with its type, CRM Contact mark, status and assignee', async () => {
  mockPhone.lookupNumber.mockResolvedValue(lead);
  renderWithTheme(<DialerScreen />);
  await typeNumber('9598377723');
  const card = screen.getByTestId('dialer-owner');
  expect(within(card).getByText('Apoorva Srivastava')).toBeOnTheScreen();
  expect(within(card).getByText('CRM Contact')).toBeOnTheScreen();
  expect(within(card).getByText('Interested')).toBeOnTheScreen();
  expect(within(card).getByText('Suryansh')).toBeOnTheScreen();
  // The initials badge is decorative (hidden from screen readers).
  expect(within(card).getByText('AS', { includeHiddenElements: true })).toBeTruthy();
});

it('adds a note or a follow-up only once the number is a CRM contact', async () => {
  renderWithTheme(<DialerScreen />);
  fireEvent.press(screen.getByTestId('dialer-add-note'));
  expect(mockNav.navigate).not.toHaveBeenCalled();

  mockPhone.lookupNumber.mockResolvedValue(lead);
  await typeNumber('9598377723');
  fireEvent.press(screen.getByTestId('dialer-add-note'));
  expect(mockNav.navigate).toHaveBeenCalledWith('AddNote', {
    kind: 'HOST_LEAD',
    id: 'h1',
    name: 'Apoorva Srivastava',
  });
  fireEvent.press(screen.getByTestId('dialer-follow-up'));
  expect(mockNav.navigate).toHaveBeenCalledWith(
    'AddReminder',
    expect.objectContaining({ kind: 'HOST_LEAD', id: 'h1', title: 'Call with Apoorva Srivastava' }),
  );
});

it('types + on a long press of 0 and clears the number on a long press of backspace', async () => {
  renderWithTheme(<DialerScreen />);
  fireEvent(screen.getByTestId('key-0'), 'longPress');
  fireEvent.press(screen.getByTestId('key-9'));
  expect(screen.getByTestId('dialer-number').props.value).toBe('+9');
  expect(mockPhone.playDialTone).toHaveBeenCalledWith('+');
  fireEvent(screen.getByTestId('dialer-backspace'), 'longPress');
  expect(screen.getByTestId('dialer-number').props.value).toBe('');
});

it('does not call with no number', () => {
  renderWithTheme(<DialerScreen />);
  fireEvent.press(screen.getByTestId('dialer-call'));
  expect(mockPhone.placeCall).not.toHaveBeenCalled();
});

it('lists recent calls with CRM contacts and puts a tapped one on the dial pad', async () => {
  mockPhone.recentCrmCalls.mockResolvedValue([
    {
      ...lead,
      id: '7',
      number: '+919598377723',
      type: 3,
      date: Date.UTC(2026, 10, 25, 6, 0),
      durationSeconds: 0,
    },
  ]);
  renderWithTheme(<DialerScreen />);
  fireEvent.press(screen.getByTestId('dialer-segment-recents'));
  expect(screen.getByTestId('dialer-segment-recents')).toBeSelected();
  fireEvent.press(await screen.findByTestId('recent-7'));
  expect(screen.getByTestId('dialer-number').props.value).toBe('+919598377723');
  expect(screen.getByTestId('dialer-segment-dialpad')).toBeSelected();
});

it('asks for the call-log permission before showing recent calls', async () => {
  (readPermissions as jest.Mock).mockResolvedValue({ phone: false });
  renderWithTheme(<DialerScreen />);
  fireEvent.press(screen.getByTestId('dialer-segment-recents'));
  fireEvent.press(await screen.findByTestId('recents-allow'));
  expect(requestPermission).toHaveBeenCalledWith('phone');
  expect(mockPhone.recentCrmCalls).not.toHaveBeenCalled();
});

it('searches CRM contacts offline and dials the one picked', async () => {
  mockPhone.searchDirectory.mockResolvedValue([
    { ...lead, phoneKey: '9598377723', city: 'Lucknow' },
  ]);
  renderWithTheme(<DialerScreen />);
  fireEvent.press(screen.getByTestId('dialer-segment-contacts'));
  fireEvent.changeText(screen.getByTestId('contacts-search'), 'apoo');
  fireEvent.press(await screen.findByTestId('contact-h1-9598377723'));
  expect(mockPhone.searchDirectory).toHaveBeenLastCalledWith('apoo', 100);
  expect(screen.getByTestId('dialer-number').props.value).toBe('9598377723');
});

it('says when no CRM contact matches the search', async () => {
  mockPhone.searchDirectory.mockResolvedValue([]);
  renderWithTheme(<DialerScreen />);
  fireEvent.press(screen.getByTestId('dialer-segment-contacts'));
  fireEvent.changeText(screen.getByTestId('contacts-search'), 'zzz');
  expect(await screen.findByText('No CRM contact matches this search.')).toBeOnTheScreen();
});

it.each([
  [2, 'call-made', false],
  [1, 'call-received', false],
  [3, 'call-missed', true],
  [5, 'call-missed', true],
])('draws call type %i as %s (missed: %s)', (type, icon, missed) => {
  expect(callKind(type)).toMatchObject({ icon, missed });
});
