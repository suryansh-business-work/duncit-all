import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { LoginForm } from '@/forms/login';
import { renderWithProviders } from '@/utils/test-utils';

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    renderWithProviders(<LoginForm onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-email')).toBeOnTheScreen();
    expect(screen.getByTestId('field-password')).toBeOnTheScreen();
  });

  it('validates email and password before submitting', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<LoginForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('field-email'), 'not-an-email');
    fireEvent.changeText(screen.getByTestId('field-password'), 'short');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(screen.getByTestId('email-error')).toBeOnTheScreen());
    expect(screen.getByTestId('password-error')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid credentials', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<LoginForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('field-email'), 'hello@duncit.com');
    fireEvent.changeText(screen.getByTestId('field-password'), 'StrongPass123');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      email: 'hello@duncit.com',
      password: 'StrongPass123',
    });
  });

  it('shows a server error message', () => {
    renderWithProviders(<LoginForm onSubmit={jest.fn()} errorMessage="Invalid credentials" />);
    expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid credentials');
  });
});
