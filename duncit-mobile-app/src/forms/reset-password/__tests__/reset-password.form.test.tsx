import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ResetPasswordForm } from '@/forms/reset-password';
import { renderWithProviders } from '@/utils/test-utils';

function fillValid() {
  fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
  fireEvent.changeText(screen.getByTestId('field-new_password'), 'StrongPass123');
  fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'StrongPass123');
}

describe('ResetPasswordForm', () => {
  it('renders otp + password fields', () => {
    renderWithProviders(<ResetPasswordForm onSubmit={jest.fn()} />);
    ['otp', 'new_password', 'confirm_password'].forEach((n) =>
      expect(screen.getByTestId(`field-${n}`)).toBeOnTheScreen(),
    );
  });

  it('rejects a non 6-digit OTP', async () => {
    renderWithProviders(<ResetPasswordForm onSubmit={jest.fn()} />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('field-otp'), '12');
    fireEvent.press(screen.getByTestId('reset-password-submit'));
    await waitFor(() => expect(screen.getByTestId('otp-error')).toHaveTextContent(/6 digit/i));
  });

  it('flags a confirm-password mismatch', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<ResetPasswordForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'Different123');
    fireEvent.press(screen.getByTestId('reset-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('confirm_password-error')).toHaveTextContent(
        'Passwords do not match',
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the valid values', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<ResetPasswordForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.press(screen.getByTestId('reset-password-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      otp: '123456',
      new_password: 'StrongPass123',
    });
  });

  it('renders an error message when provided', () => {
    renderWithProviders(<ResetPasswordForm onSubmit={jest.fn()} errorMessage="Invalid OTP" />);
    expect(screen.getByTestId('reset-password-error')).toHaveTextContent('Invalid OTP');
  });

  it('renders the submit button in a loading state', () => {
    renderWithProviders(<ResetPasswordForm onSubmit={jest.fn()} loading />);
    expect(screen.getByTestId('reset-password-submit')).toBeOnTheScreen();
  });
});
