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
      // The channel rides out with the values: it is what the form was showing,
      // and the service sends only the boxes belonging to it.
      channel: 'EMAIL',
      email: 'hello@duncit.com',
      phoneExtension: '+91',
      phoneNumber: '',
      password: 'StrongPass123',
    });
  });

  it('shows a server error message', () => {
    renderWithProviders(<LoginForm onSubmit={jest.fn()} errorMessage="Invalid credentials" />);
    expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid credentials');
  });

  /*
    Continue with password reaches the same account on either identifier. The
    form is REMOUNTED per channel, so switching must swap the boxes outright
    rather than leave the previous channel's field on screen.
  */
  it('swaps the email box for the number when the phone channel is chosen', () => {
    renderWithProviders(<LoginForm onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByTestId('login-channel-PHONE'));

    expect(screen.queryByTestId('field-email')).toBeNull();
    expect(screen.getByTestId('field-phoneNumber')).toBeOnTheScreen();
    expect(screen.getByTestId('field-password')).toBeOnTheScreen();
  });

  it('submits a phone sign-in with the channel that was showing', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<LoginForm onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId('login-channel-PHONE'));
    fireEvent.changeText(screen.getByTestId('field-phoneNumber'), '9845012345');
    fireEvent.changeText(screen.getByTestId('field-password'), 'StrongPass123');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      channel: 'PHONE',
      phoneExtension: '+91',
      phoneNumber: '9845012345',
      password: 'StrongPass123',
    });
  });
});
