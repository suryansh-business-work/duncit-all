import { screen } from '@testing-library/react-native';

import { CompanionsChecklist } from '../CompanionsChecklist';
import { renderWithProviders } from '@/utils/test-utils';

/**
 * A group check-in that only swaps one line of text reads as "nothing
 * happened". This list is what tells a host WHO was accounted for, so the
 * things worth holding are that every person appears by name and that an empty
 * roster renders nothing rather than an empty heading.
 */
describe('CompanionsChecklist', () => {
  const people = [
    { key: 'u1', primary: 'Riya Sharma' },
    { key: '9876543210', primary: 'Arjun Mehta', secondary: '+91 9876543210' },
  ];

  it('names every person on the roster', () => {
    renderWithProviders(<CompanionsChecklist title="Checked in" people={people} />);

    expect(screen.getByTestId('scan-checked-in-list')).toBeOnTheScreen();
    expect(screen.getByText('Checked in')).toBeOnTheScreen();
    expect(screen.getByText('Riya Sharma')).toBeOnTheScreen();
    expect(screen.getByText('Arjun Mehta')).toBeOnTheScreen();
  });

  it('shows the phone on file for a companion, and omits it for the buyer', () => {
    renderWithProviders(<CompanionsChecklist title="Checked in" people={people} />);

    // The buyer is identified by their account, so there is no number to show.
    expect(screen.getByText('+91 9876543210')).toBeOnTheScreen();
    expect(screen.queryAllByText('+91 9876543210')).toHaveLength(1);
  });

  it('renders nothing at all when nobody has been accounted for', () => {
    renderWithProviders(<CompanionsChecklist title="Checked in" people={[]} />);

    // Not an empty heading — the section is absent, so the screen does not
    // claim a roster it does not have.
    expect(screen.queryByTestId('scan-checked-in-list')).toBeNull();
    expect(screen.queryByText('Checked in')).toBeNull();
  });
});
