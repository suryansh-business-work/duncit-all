import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CompletionMeter } from '@/components/account/CompletionMeter';
import { EditAccountDialog } from '@/components/account/EditAccountDialog';
import type { AccountMe } from '@/hooks/useAccount';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [
      {
        id: 'l1',
        location_name: 'Pune',
        city: 'Pune',
        state: 'Maharashtra',
        state_code: 'MH',
        country: 'India',
        country_code: 'in',
      },
    ],
  }),
}));

const me = {
  user_id: 'u1',
  first_name: 'Riya',
  last_name: 'Sharma',
  full_name: 'Riya Sharma',
  email: 'riya@duncit.com',
  phone_number: '9876543210',
  phone_extension: '+91',
  whatsapp_number: '',
  whatsapp_extension: '+91',
  profile_photo: null,
  bio: 'Hello there',
  city: 'Pune',
  state: 'Maharashtra',
  country: 'India',
  dob: '1995-01-01',
  roles: ['USER'],
  status: 'ACTIVE',
  created_at: '2024-01-01',
} as unknown as AccountMe;

const isDisabled = (testID: string) => {
  const node = screen.getByTestId(testID);
  return node.props.accessibilityState?.disabled === true || node.props['aria-disabled'] === true;
};

describe('CompletionMeter', () => {
  it('shows the computed completion percentage (8/10 filled → 80%)', () => {
    renderWithProviders(<CompletionMeter profile={me} />);
    expect(screen.getByTestId('profile-completion-value')).toHaveTextContent('80% complete');
  });

  it('shows 0% for an empty profile', () => {
    renderWithProviders(<CompletionMeter profile={{}} />);
    expect(screen.getByTestId('profile-completion-value')).toHaveTextContent('0% complete');
  });
});

describe('AccountEditForm — discard button', () => {
  it('does nothing when pressed while pristine (disabled)', () => {
    renderWithProviders(<EditAccountDialog open me={me} onClose={jest.fn()} onSave={jest.fn()} />);

    expect(isDisabled('account-edit-discard')).toBe(true);
    fireEvent.press(screen.getByTestId('account-edit-discard'));
    // The loaded value is untouched — the disabled press is a no-op.
    expect(screen.getByTestId('field-first_name').props.value).toBe('Riya');
  });

  it('is disabled while pristine, enables on change, and reverts to loaded values', async () => {
    renderWithProviders(<EditAccountDialog open me={me} onClose={jest.fn()} onSave={jest.fn()} />);

    // Pristine → discard disabled.
    expect(isDisabled('account-edit-discard')).toBe(true);

    // Edit a field → discard enables.
    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    await waitFor(() => expect(isDisabled('account-edit-discard')).toBe(false));
    expect(screen.getByTestId('field-first_name').props.value).toBe('Riya R');

    // Discard → field reverts to the loaded value and the button disables again.
    fireEvent.press(screen.getByTestId('account-edit-discard'));
    await waitFor(() => expect(screen.getByTestId('field-first_name').props.value).toBe('Riya'));
    await waitFor(() => expect(isDisabled('account-edit-discard')).toBe(true));
  });
});

describe('EditAccountDialog — unsaved-changes guard', () => {
  it('closes immediately when there are no unsaved changes', () => {
    const onClose = jest.fn();
    renderWithProviders(<EditAccountDialog open me={me} onClose={onClose} onSave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('edit-account-close'));

    expect(screen.queryByTestId('edit-account-discard-confirm-confirm')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms before closing when dirty — Keep editing stays open', async () => {
    const onClose = jest.fn();
    renderWithProviders(<EditAccountDialog open me={me} onClose={onClose} onSave={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    await waitFor(() => expect(isDisabled('account-edit-discard')).toBe(false));

    fireEvent.press(screen.getByTestId('edit-account-close'));
    expect(screen.getByTestId('edit-account-discard-confirm')).toBeOnTheScreen();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('edit-account-discard-confirm-cancel'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('confirms before closing when dirty — Discard reverts and closes', async () => {
    const onClose = jest.fn();
    renderWithProviders(<EditAccountDialog open me={me} onClose={onClose} onSave={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    await waitFor(() => expect(isDisabled('account-edit-discard')).toBe(false));

    fireEvent.press(screen.getByTestId('edit-account-close'));
    fireEvent.press(screen.getByTestId('edit-account-discard-confirm-confirm'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
