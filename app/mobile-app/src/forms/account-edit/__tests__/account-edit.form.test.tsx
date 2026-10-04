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
  whatsapp_number: '9876543211',
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

const setup = (props: Partial<Parameters<typeof AccountEditForm>[0]> = {}) =>
  renderWithProviders(<AccountEditForm me={me} onSubmit={jest.fn()} {...props} />);

// Save is a <DuncitButton/>, which reports its state as `aria-disabled` —
// `accessibilityState` is not among the props it forwards.
const saveDisabled = () =>
  screen.getByTestId('account-edit-submit').props['aria-disabled'] === true;

/**
 * Disabled means no real tap can land: the host view is announced disabled and
 * never becomes a touch responder. (fireEvent.press would bubble up to
 * DuncitButton's own composite `onPress` prop, which no real touch reaches, so
 * it cannot prove this.)
 */
const expectSaveInert = () => {
  const save = screen.getByTestId('account-edit-submit');
  expect(save.props['aria-disabled']).toBe(true);
  expect(save.props.onStartShouldSetResponder).toBeUndefined();
  expect(save.props.onResponderRelease).toBeUndefined();
};

/** Press Save once it is enabled (RHF validates onChange asynchronously). */
const pressSaveWhenEnabled = async () => {
  await waitFor(() => expect(saveDisabled()).toBe(false));
  fireEvent.press(screen.getByTestId('account-edit-submit'));
};

describe('AccountEditForm', () => {
  it('prefills the loaded user values including the date of birth (bug 8)', () => {
    setup();
    expect(screen.getByTestId('field-first_name').props.value).toBe('Riya');
    // Stored as YYYY-MM-DD, shown in the typeable form of the admin's date
    // pattern (the fallback dd MMM yyyy → DD MM YYYY when no settings load).
    expect(screen.getByTestId('field-dob').props.value).toBe('01 01 1995');
  });

  it('keeps Save disabled until a valid change is made, then submits (bug 4 gating)', async () => {
    const onSubmit = jest.fn();
    setup({ onSubmit });

    // Pristine: the button is disabled and no tap can reach it.
    expect(saveDisabled()).toBe(true);
    expectSaveInert();

    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    await pressSaveWhenEnabled();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The untouched birthday still submits in the stored YYYY-MM-DD shape.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      first_name: 'Riya R',
      state: 'Maharashtra',
      dob: '1995-01-01',
    });
  });

  it('validates the date of birth and submits an edited dob (bug 8)', async () => {
    const onSubmit = jest.fn();
    setup({ onSubmit });

    fireEvent.changeText(screen.getByTestId('field-dob'), '01/01/1995');
    await waitFor(() =>
      expect(screen.getByTestId('dob-error')).toHaveTextContent('Use the format DD MM YYYY'),
    );
    expectSaveInert();

    // Typed in the box's own pattern, stored as YYYY-MM-DD.
    fireEvent.changeText(screen.getByTestId('field-dob'), '31 12 1990');
    // A valid dob re-enables Save and submits the new value; assert via the
    // stable enabled-state + submit below rather than the error node, whose exit
    // animation can briefly linger in CI.
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

  it('shows the phone number read-only, changed only through its own verified door', () => {
    setup();
    // Contacts are not form boxes any more — each moves behind a one-time code.
    expect(screen.queryByTestId('field-phone_number')).toBeNull();
    expect(screen.getByText('+91 9876543210')).toBeOnTheScreen();
    expect(screen.getByTestId('contact-change-PHONE')).toBeOnTheScreen();
  });

  it('marks every contact detail required and blocks Save while one is missing', async () => {
    const onSubmit = jest.fn();
    setup({ me: { ...me, whatsapp_number: '' } as AccountMe, onSubmit });

    expect(screen.getByTestId('contact-required')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-first_name'), 'Riya R');
    await waitFor(() => expect(saveDisabled()).toBe(true));
    expectSaveInert();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('says nothing about required contacts once the account holds all three', () => {
    setup();
    expect(screen.queryByTestId('contact-required')).toBeNull();
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
