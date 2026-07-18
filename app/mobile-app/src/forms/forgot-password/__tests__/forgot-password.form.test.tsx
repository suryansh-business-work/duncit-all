import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ForgotPasswordForm } from '@/forms/forgot-password';
import { renderWithProviders } from '@/utils/test-utils';

describe('ForgotPasswordForm', () => {
  it('renders the email field', () => {
    renderWithProviders(<ForgotPasswordForm onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-email')).toBeOnTheScreen();
  });

  it('rejects an invalid email and does not submit', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<ForgotPasswordForm onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('field-email'), 'nope');
    fireEvent.press(screen.getByTestId('forgot-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('email-error')).toHaveTextContent(/valid email/i),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid email', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<ForgotPasswordForm onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
    fireEvent.press(screen.getByTestId('forgot-password-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ email: 'riya@duncit.com' });
  });

  it('shows an error message when provided', () => {
    renderWithProviders(<ForgotPasswordForm onSubmit={jest.fn()} errorMessage="No account" />);
    expect(screen.getByTestId('forgot-password-error')).toHaveTextContent('No account');
  });

  it('shows a server-side email error below the field', () => {
    renderWithProviders(<ForgotPasswordForm onSubmit={jest.fn()} emailError="Unregistered User" />);
    expect(screen.getByTestId('forgot-email-error')).toHaveTextContent('Unregistered User');
  });

  it('renders the submit button in a loading state', () => {
    renderWithProviders(<ForgotPasswordForm onSubmit={jest.fn()} loading />);
    expect(screen.getByTestId('forgot-password-submit')).toBeOnTheScreen();
  });
});
