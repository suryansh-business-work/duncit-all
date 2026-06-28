import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { DeleteAccountForm } from '@/forms/delete-account';
import { renderWithProviders } from '@/utils/test-utils';

describe('DeleteAccountForm', () => {
  it('renders the otp field', () => {
    renderWithProviders(<DeleteAccountForm onSubmit={jest.fn()} />);
    expect(screen.getByTestId('field-otp')).toBeOnTheScreen();
  });

  it('rejects a non 6-digit OTP', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<DeleteAccountForm onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('field-otp'), '12');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    await waitFor(() => expect(screen.getByTestId('otp-error')).toHaveTextContent(/6 digit/i));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid otp', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<DeleteAccountForm onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ otp: '123456' });
  });

  it('renders error + loading states', () => {
    renderWithProviders(
      <DeleteAccountForm onSubmit={jest.fn()} errorMessage="Invalid OTP" loading />,
    );
    expect(screen.getByTestId('delete-account-error')).toHaveTextContent('Invalid OTP');
    expect(screen.getByTestId('delete-account-submit')).toBeOnTheScreen();
  });
});
