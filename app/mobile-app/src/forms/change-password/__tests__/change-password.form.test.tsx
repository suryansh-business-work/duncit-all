import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CurrentPasswordForm, NewPasswordForm } from '@/forms/change-password';
import { renderWithProviders } from '@/utils/test-utils';

describe('CurrentPasswordForm', () => {
  it('renders the current-password field', () => {
    renderWithProviders(<CurrentPasswordForm onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-current_password')).toBeOnTheScreen();
  });

  it('requires a non-empty current password', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CurrentPasswordForm onSubmit={onSubmit} />);
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('current_password-error')).toHaveTextContent(/current password/i),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered current password', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<CurrentPasswordForm onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('field-current_password'), 'OldPass123');
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ current_password: 'OldPass123' });
  });

  it('renders error + loading states', () => {
    renderWithProviders(
      <CurrentPasswordForm onSubmit={jest.fn()} errorMessage="Wrong password" loading />,
    );
    expect(screen.getByTestId('current-password-error')).toHaveTextContent('Wrong password');
    expect(screen.getByTestId('current-password-submit')).toBeOnTheScreen();
  });
});

function fillValid() {
  fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
  fireEvent.changeText(screen.getByTestId('field-new_password'), 'StrongPass123');
  fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'StrongPass123');
}

describe('NewPasswordForm', () => {
  it('renders otp + password fields', () => {
    renderWithProviders(<NewPasswordForm onSubmit={jest.fn()} />);
    ['otp', 'new_password', 'confirm_password'].forEach((n) =>
      expect(screen.getByTestId(`field-${n}`)).toBeOnTheScreen(),
    );
  });

  it('rejects a non 6-digit OTP', async () => {
    renderWithProviders(<NewPasswordForm onSubmit={jest.fn()} />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('field-otp'), '12');
    fireEvent.press(screen.getByTestId('new-password-submit'));
    await waitFor(() => expect(screen.getByTestId('otp-error')).toHaveTextContent(/6 digit/i));
  });

  it('flags a confirm-password mismatch', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<NewPasswordForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'Different123');
    fireEvent.press(screen.getByTestId('new-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('confirm_password-error')).toHaveTextContent(
        'Passwords do not match',
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the valid values', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<NewPasswordForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.press(screen.getByTestId('new-password-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      otp: '123456',
      new_password: 'StrongPass123',
    });
  });

  it('renders error + loading states', () => {
    renderWithProviders(
      <NewPasswordForm onSubmit={jest.fn()} errorMessage="Invalid OTP" loading />,
    );
    expect(screen.getByTestId('new-password-error')).toHaveTextContent('Invalid OTP');
    expect(screen.getByTestId('new-password-submit')).toBeOnTheScreen();
  });
});
