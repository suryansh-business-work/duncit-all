import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CompanionsForm } from '../CompanionsForm';
import { renderWithProviders } from '@/utils/test-utils';

const mockOtp = {
  activeIndex: null as number | null,
  challengeId: '',
  testCode: '',
  sending: false,
  verifying: false,
  error: '',
  start: jest.fn(),
  submit: jest.fn().mockResolvedValue(null),
  cancel: jest.fn(),
};

jest.mock('@/hooks/useCompanionOtp', () => ({
  useCompanionOtp: () => mockOtp,
}));

/**
 * The rest of the group, collected at the door.
 *
 * A multi-seat ticket is a number until someone writes down who it covers, and
 * the scan is the one moment they are all standing there — so the ticket does
 * not check in until every one of them has a name and a phone number.
 */
const props = {
  podId: 'DUN-POD-4821',
  membershipId: 'm-1',
  seats: 3,
  required: 2,
  reserved: [] as string[],
  onSubmit: jest.fn(),
};

const fillRow = (index: number, name: string, phone: string) => {
  fireEvent.changeText(screen.getByTestId(`companion-name-${index}`), name);
  fireEvent.changeText(screen.getByTestId(`companion-phone-${index}`), phone);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOtp.activeIndex = null;
  mockOtp.challengeId = '';
});

describe('CompanionsForm', () => {
  it('opens one row per seat the ticket still owes', () => {
    renderWithProviders(<CompanionsForm {...props} />);

    expect(screen.getByTestId('scan-companions-form')).toBeOnTheScreen();
    expect(screen.getByTestId('companion-name-0')).toBeOnTheScreen();
    expect(screen.getByTestId('companion-name-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('companion-name-2')).toBeNull();
  });

  it('says how many of the seats still need someone', () => {
    renderWithProviders(<CompanionsForm {...props} />);

    expect(screen.getByText('Who else is coming in?')).toBeOnTheScreen();
    expect(screen.getByText(/This ticket admits 3/)).toBeOnTheScreen();
  });

  it('refuses to submit a half-filled roster, and says so once tried', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CompanionsForm {...props} onSubmit={onSubmit} />);

    // Silent until the host actually tries — an error under an untouched form
    // reads as a broken screen.
    expect(screen.queryByTestId('companions-incomplete')).toBeNull();

    fillRow(0, 'Arjun Mehta', '9876543210');
    fireEvent.press(screen.getByTestId('companions-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('companions-incomplete')).toBeOnTheScreen();
  });

  it('submits every companion once each has a name and a number', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CompanionsForm {...props} onSubmit={onSubmit} />);

    fillRow(0, 'Arjun Mehta', '9876543210');
    fillRow(1, 'Riya Sharma', '9876500000');
    fireEvent.press(screen.getByTestId('companions-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const sent = onSubmit.mock.calls[0][0];
    expect(sent).toHaveLength(2);
    expect(sent[0].name).toBe('Arjun Mehta');
    expect(sent[1].name).toBe('Riya Sharma');
  });

  it('clears a row’s proof the moment its details are edited', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CompanionsForm {...props} required={1} onSubmit={onSubmit} />);

    fillRow(0, 'Arjun Mehta', '9876543210');
    // Retyping the number makes it a different person, so any challenge the row
    // had earned no longer describes it.
    fireEvent.changeText(screen.getByTestId('companion-phone-0'), '9999999999');
    fireEvent.press(screen.getByTestId('companions-submit'));

    // companionEntriesToInput sends null rather than an empty string, so the
    // server reads "no proof" instead of a blank one.
    expect(onSubmit.mock.calls[0][0][0].otp_challenge_id).toBeNull();
  });

  it('is inert while the mark is being sent, so one press is one attendance', () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CompanionsForm {...props} busy onSubmit={onSubmit} />);

    const submit = screen.getByTestId('companions-submit');
    expect(submit.props['aria-disabled']).toBe(true);
    expect(submit.props.onPress).toBeUndefined();

    fireEvent.press(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps a proof against its row and sends it with the roster', async () => {
    const onSubmit = jest.fn();
    mockOtp.activeIndex = 0;
    mockOtp.challengeId = 'ch-1';
    mockOtp.submit.mockResolvedValue('ch-spent');

    // TWO rows on purpose: the proof must attach to row 0 and leave row 1
    // untouched, which is the half of that map a single-row roster never runs.
    renderWithProviders(<CompanionsForm {...props} required={2} onSubmit={onSubmit} />);

    fillRow(0, 'Arjun Mehta', '9876543210');
    fillRow(1, 'Riya Sharma', '9876500000');
    fireEvent.press(screen.getByTestId('companion-otp-verify-0'));
    await waitFor(() => expect(mockOtp.submit).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('companions-submit'));

    // The proof has to survive as far as the mutation — it is the record of
    // WHICH attendees were actually verified rather than just written down.
    expect(onSubmit.mock.calls[0][0][0].otp_challenge_id).toBe('ch-spent');
    expect(onSubmit.mock.calls[0][0][1].otp_challenge_id).toBeNull();
  });

  it('opens no rows at all when the ticket owes nobody', () => {
    renderWithProviders(<CompanionsForm {...props} required={0} />);

    expect(screen.queryByTestId('companion-name-0')).toBeNull();
  });
});
