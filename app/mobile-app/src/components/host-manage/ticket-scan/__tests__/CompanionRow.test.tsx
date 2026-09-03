import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { CompanionEntry } from '@duncit/utils';

import { CompanionRow } from '../CompanionRow';
import { renderWithProviders } from '@/utils/test-utils';
import { otpApi } from '@/utils/companion-otp-fixture';

/**
 * One of the other people a ticket admits. Name and number are what the
 * booking owes the door; the code under them is optional proof.
 */
const blank: CompanionEntry = {
  name: '',
  phone_extension: '+91',
  phone_number: '',
  otp_challenge_id: '',
};

describe('CompanionRow', () => {
  it('numbers itself from one, not from zero', () => {
    renderWithProviders(
      <CompanionRow
        index={0}
        entry={blank}
        otp={otpApi()}
        onChange={jest.fn()}
        onVerified={jest.fn()}
      />,
    );

    // The host is reading this aloud to a queue of people.
    expect(screen.getByText('Person 1')).toBeOnTheScreen();
  });

  it('reports each field against its own row index', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <CompanionRow
        index={2}
        entry={blank}
        otp={otpApi()}
        onChange={onChange}
        onVerified={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByTestId('companion-name-2'), 'Arjun Mehta');
    expect(onChange).toHaveBeenCalledWith(2, { name: 'Arjun Mehta' });

    fireEvent.changeText(screen.getByTestId('companion-extension-2'), '+44');
    expect(onChange).toHaveBeenCalledWith(2, { phone_extension: '+44' });

    fireEvent.changeText(screen.getByTestId('companion-phone-2'), '9876543210');
    expect(onChange).toHaveBeenCalledWith(2, { phone_number: '9876543210' });
  });

  it('says both fields are required rather than only complaining later', () => {
    renderWithProviders(
      <CompanionRow
        index={0}
        entry={blank}
        otp={otpApi()}
        onChange={jest.fn()}
        onVerified={jest.fn()}
      />,
    );

    expect(screen.getAllByText(/Required/)).toHaveLength(2);
  });

  it('opens the code box on a complete row that holds the live challenge', () => {
    const onVerified = jest.fn();
    // Complete but not yet proved — a row with a challenge id is VERIFIED and
    // has nothing left to enter.
    const filled: CompanionEntry = {
      ...blank,
      name: 'Arjun Mehta',
      phone_number: '9876543210',
    };

    renderWithProviders(
      <CompanionRow
        index={3}
        entry={filled}
        otp={otpApi({ activeIndex: 3, challengeId: 'ch-1', submit: jest.fn() })}
        onChange={jest.fn()}
        onVerified={onVerified}
      />,
    );

    // The panel reports only a challenge id; the row is what knows WHOSE it is.
    expect(screen.getByTestId('companion-otp-code-3')).toBeOnTheScreen();
  });

  it('tags a spent challenge with the index of the row that earned it', async () => {
    const onVerified = jest.fn();
    const submit = jest.fn().mockResolvedValue('ch-spent');
    const complete: CompanionEntry = {
      ...blank,
      name: 'Arjun Mehta',
      phone_number: '9876543210',
    };

    renderWithProviders(
      <CompanionRow
        index={4}
        entry={complete}
        otp={otpApi({ activeIndex: 4, challengeId: 'ch-1', submit })}
        onChange={jest.fn()}
        onVerified={onVerified}
      />,
    );

    fireEvent.changeText(screen.getByTestId('companion-otp-code-4'), '482913');
    fireEvent.press(screen.getByTestId('companion-otp-verify-4'));

    // The panel only knows the challenge; the row is what knows WHOSE it is.
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith(4, 'ch-spent'));
  });

  it('shows the row as verified once it carries a proof', () => {
    const proved: CompanionEntry = {
      name: 'Arjun Mehta',
      phone_extension: '+91',
      phone_number: '9876543210',
      otp_challenge_id: 'ch-spent',
    };

    renderWithProviders(
      <CompanionRow
        index={0}
        entry={proved}
        otp={otpApi()}
        onChange={jest.fn()}
        onVerified={jest.fn()}
      />,
    );

    expect(screen.getByTestId('companion-verified-0')).toBeOnTheScreen();
  });
});
