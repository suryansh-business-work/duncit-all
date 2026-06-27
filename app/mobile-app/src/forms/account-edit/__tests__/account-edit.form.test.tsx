import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AccountEditForm } from '@/forms/account-edit';
import type { AccountMe } from '@/hooks/useAccount';
import type { CountryNode } from '@/utils/location-tree';
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
  state: 'Maharashtra',
  country: 'India',
  dob: '1995-01-01',
  roles: ['USER'],
  status: 'ACTIVE',
  created_at: '2024-01-01',
} as unknown as AccountMe;

const countries: CountryNode[] = [
  {
    country: 'India',
    country_code: 'in',
    states: [
      {
        state: 'Maharashtra',
        state_code: 'MH',
        cities: [{ city: 'Pune', location_name: 'Pune' }] as never,
      },
    ],
  },
];

const setup = (props: Partial<Parameters<typeof AccountEditForm>[0]> = {}) =>
  renderWithProviders(
    <AccountEditForm me={me} countries={countries} onSubmit={jest.fn()} {...props} />,
  );

const saveDisabled = () =>
  screen.getByTestId('account-edit-submit').props.accessibilityState?.disabled === true;

/** Press Save once it is enabled (RHF validates onChange asynchronously). */
const pressSaveWhenEnabled = async () => {
  await waitFor(() => expect(saveDisabled()).toBe(false));
  fireEvent.press(screen.getByTestId('account-edit-submit'));
};

describe('AccountEditForm', () => {
  it('prefills the loaded user values including the date of birth (bug 8)', () => {
    setup();
    expect(screen.getByTestId('field-first_name').props.value).toBe('Riya');
    expect(screen.getByTestId('field-dob').props.value).toBe('1995-01-01');
  });

  it('keeps Save disabled until a valid change is made, then submits (bug 4 gating)', async () => {
    const onSubmit = jest.fn();
    setup({ onSubmit });

    // Pristine: the button is disabled and pressing it does nothing.
    expect(saveDisabled()).toBe(true);
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    await pressSaveWhenEnabled();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ first_name: 'Riya R', state: 'Maharashtra' });
  });

  it('validates the date of birth and submits an edited dob (bug 8)', async () => {
    const onSubmit = jest.fn();
    setup({ onSubmit });

    fireEvent.changeText(screen.getByTestId('field-dob'), '01/01/1995');
    await waitFor(() =>
      expect(screen.getByTestId('dob-error')).toHaveTextContent('Use the format YYYY-MM-DD'),
    );
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-dob'), '1990-12-31');
    await waitFor(() => expect(screen.queryByTestId('dob-error')).toBeNull());
    await pressSaveWhenEnabled();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ dob: '1990-12-31' });
  });

  it('blocks submit when the first name is cleared', async () => {
    const onSubmit = jest.fn();
    setup({ onSubmit });

    fireEvent.changeText(screen.getByTestId('field-first_name'), '');
    await waitFor(() =>
      expect(screen.getByTestId('first_name-error')).toHaveTextContent('First name is required'),
    );
    fireEvent.press(screen.getByTestId('account-edit-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects non-digit phone numbers', async () => {
    setup();
    fireEvent.changeText(screen.getByTestId('field-phone_number'), 'abc123');
    await waitFor(() =>
      expect(screen.getByTestId('phone_number-error')).toHaveTextContent('Digits only'),
    );
  });

  it('renders the error message when provided', () => {
    setup({ errorMessage: 'Save failed' });
    expect(screen.getByTestId('account-edit-error')).toHaveTextContent('Save failed');
  });

  it('switches the button label while saving', () => {
    setup({ loading: true });
    expect(screen.getByTestId('account-edit-submit')).toBeOnTheScreen();
    expect(screen.queryByText('Save')).toBeNull();
  });
});
