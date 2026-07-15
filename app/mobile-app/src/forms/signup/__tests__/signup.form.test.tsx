import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SignupForm } from '@/forms/signup';
import { renderWithProviders } from '@/utils/test-utils';

function fillValid() {
  fireEvent.changeText(screen.getByTestId('field-name'), 'Riya Sharma');
  fireEvent.changeText(screen.getByTestId('field-birthYear'), '1995');
  fireEvent.changeText(screen.getByTestId('field-email'), 'riya@duncit.com');
  fireEvent.changeText(screen.getByTestId('field-password'), 'StrongPass123');
  fireEvent.changeText(screen.getByTestId('field-confirmPassword'), 'StrongPass123');
}

describe('SignupForm', () => {
  it('renders all five fields', () => {
    renderWithProviders(<SignupForm onSubmit={jest.fn()} />);
    ['name', 'birthYear', 'email', 'password', 'confirmPassword'].forEach((name) =>
      expect(screen.getByTestId(`field-${name}`)).toBeOnTheScreen(),
    );
  });

  it('shows validation errors and does not submit when empty', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<SignupForm onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(screen.getByTestId('name-error')).toBeOnTheScreen());
    expect(screen.getByTestId('birthYear-error')).toBeOnTheScreen();
    expect(screen.getByTestId('email-error')).toBeOnTheScreen();
    expect(screen.getByTestId('password-error')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('flags mismatched confirm password', async () => {
    renderWithProviders(<SignupForm onSubmit={jest.fn()} />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('field-confirmPassword'), 'Different123');

    fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('confirmPassword-error')).toHaveTextContent(
        'Passwords do not match',
      ),
    );
  });

  it('rejects an out-of-range birth year', async () => {
    renderWithProviders(<SignupForm onSubmit={jest.fn()} />);
    fillValid();
    fireEvent.changeText(screen.getByTestId('field-birthYear'), '1850');

    fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('birthYear-error')).toHaveTextContent(
        'Enter a year between 1940 and 2012',
      ),
    );
  });

  it('submits the typed values when valid', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<SignupForm onSubmit={onSubmit} />);
    fillValid();

    fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Riya Sharma',
      birthYear: '1995',
      email: 'riya@duncit.com',
      password: 'StrongPass123',
      confirmPassword: 'StrongPass123',
    });
  });

  it('renders the error message when provided', () => {
    renderWithProviders(<SignupForm onSubmit={jest.fn()} errorMessage="Email already in use" />);
    expect(screen.getByTestId('signup-error')).toHaveTextContent('Email already in use');
  });
});
