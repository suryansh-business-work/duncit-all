import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AccountEditForm } from '@/forms/account-edit';
import type { AccountMe } from '@/hooks/useAccount';
import { renderWithProviders } from '@/utils/test-utils';

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
  bio: 'Hello',
  city: 'Pune',
  zone: 'Kothrud',
  country: 'India',
  dob: '1995-01-01',
  roles: ['USER'],
  status: 'ACTIVE',
  created_at: '2024-01-01',
} as unknown as AccountMe;

describe('AccountEditForm', () => {
  it('prefills the loaded user values including the date of birth (bug 8)', () => {
    renderWithProviders(<AccountEditForm me={me} onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-first_name').props.value).toBe('Riya');
    expect(screen.getByTestId('field-city').props.value).toBe('Pune');
    expect(screen.getByTestId('field-dob').props.value).toBe('1995-01-01');
  });

  it('validates the date of birth and submits an edited dob (bug 8)', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<AccountEditForm me={me} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('field-dob'), '01/01/1995');
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('dob-error')).toHaveTextContent('Use the format YYYY-MM-DD'),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-dob'), '1990-12-31');
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ dob: '1990-12-31' });
  });

  it('requires a first name', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<AccountEditForm me={me} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('field-first_name'), '');
    fireEvent.press(screen.getByTestId('account-edit-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('first_name-error')).toHaveTextContent('First name is required'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects non-digit phone numbers', async () => {
    renderWithProviders(<AccountEditForm me={me} onSubmit={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('field-phone_number'), 'abc123');
    fireEvent.press(screen.getByTestId('account-edit-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('phone_number-error')).toHaveTextContent('Digits only'),
    );
  });

  it('submits the edited values when valid', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<AccountEditForm me={me} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    fireEvent.press(screen.getByTestId('account-edit-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ first_name: 'Riya R', city: 'Pune' });
  });

  it('renders the error message when provided', () => {
    renderWithProviders(
      <AccountEditForm me={me} onSubmit={jest.fn()} errorMessage="Save failed" />,
    );
    expect(screen.getByTestId('account-edit-error')).toHaveTextContent('Save failed');
  });

  it('switches the button label while saving', () => {
    renderWithProviders(<AccountEditForm me={me} onSubmit={jest.fn()} loading />);
    expect(screen.getByTestId('account-edit-submit')).toBeOnTheScreen();
    expect(screen.queryByText('Save')).toBeNull();
  });
});
