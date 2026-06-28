import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ChangePasswordDialog, DeleteAccountDialog, SecuritySection } from '@/components/account';
import {
  MobileChangePasswordWithOtpDocument,
  MobileDeleteMyAccountDocument,
  MobileRequestAccountDeletionOtpDocument,
  MobileRequestPasswordChangeOtpDocument,
} from '@/graphql/account';
import { useLogout } from '@/hooks/useLogout';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useLogout', () => ({ useLogout: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
const mockedUseLogout = useLogout as jest.Mock;
const logout = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseLogout.mockReturnValue(logout);
});

function fillNewPassword() {
  fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
  fireEvent.changeText(screen.getByTestId('field-new_password'), 'StrongPass123');
  fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'StrongPass123');
}

describe('ChangePasswordDialog', () => {
  it('is hidden when closed', () => {
    renderWithProviders(
      <ChangePasswordDialog open={false} onClose={jest.fn()} onChanged={jest.fn()} />,
    );
    expect(screen.queryByTestId('current-password-submit')).toBeNull();
  });

  it('runs the full two-step flow, resends, and changes the password', async () => {
    const onChanged = jest.fn();
    mockRequest.mockResolvedValue({ requestPasswordChangeOtp: { ok: true } });
    renderWithProviders(<ChangePasswordDialog open onClose={jest.fn()} onChanged={onChanged} />);

    fireEvent.changeText(screen.getByTestId('field-current_password'), 'OldPass123');
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() => expect(screen.getByTestId('change-password-info')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(
      MobileRequestPasswordChangeOtpDocument,
      { input: { current_password: 'OldPass123' } },
      { auth: true },
    );

    fireEvent.press(screen.getByTestId('change-password-resend'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));

    fillNewPassword();
    fireEvent.press(screen.getByTestId('new-password-submit'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenLastCalledWith(
      MobileChangePasswordWithOtpDocument,
      { input: { otp: '123456', new_password: 'StrongPass123' } },
      { auth: true },
    );
  });

  it('surfaces a request error and a non-Error rejection on resend', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Wrong password'));
    renderWithProviders(<ChangePasswordDialog open onClose={jest.fn()} onChanged={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('field-current_password'), 'bad');
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('current-password-error')).toHaveTextContent('Wrong password'),
    );
  });

  it('surfaces a change error then closes', async () => {
    const onClose = jest.fn();
    mockRequest
      .mockResolvedValueOnce({ requestPasswordChangeOtp: { ok: true } })
      .mockRejectedValueOnce('nope');
    renderWithProviders(<ChangePasswordDialog open onClose={onClose} onChanged={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('field-current_password'), 'OldPass123');
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() => expect(screen.getByTestId('field-otp')).toBeOnTheScreen());
    fillNewPassword();
    fireEvent.press(screen.getByTestId('new-password-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('new-password-error')).toHaveTextContent('Something went wrong.'),
    );
    fireEvent.press(screen.getByTestId('change-password-dialog-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces a non-Error rejection while resending in step 2', async () => {
    mockRequest
      .mockResolvedValueOnce({ requestPasswordChangeOtp: { ok: true } })
      .mockRejectedValueOnce('boom');
    renderWithProviders(<ChangePasswordDialog open onClose={jest.fn()} onChanged={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('field-current_password'), 'OldPass123');
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() => expect(screen.getByTestId('change-password-resend')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('change-password-resend'));
    await waitFor(() =>
      expect(screen.getByTestId('new-password-error')).toHaveTextContent('Something went wrong.'),
    );
  });
});

describe('DeleteAccountDialog', () => {
  it('is hidden when closed', () => {
    renderWithProviders(
      <DeleteAccountDialog open={false} onClose={jest.fn()} onDeleted={jest.fn()} />,
    );
    expect(screen.queryByTestId('delete-account-submit')).toBeNull();
  });

  it('deletes with the entered OTP and reports back', async () => {
    const onDeleted = jest.fn();
    mockRequest.mockResolvedValue({ deleteMyAccount: true });
    renderWithProviders(<DeleteAccountDialog open onClose={jest.fn()} onDeleted={onDeleted} />);
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith(
      MobileDeleteMyAccountDocument,
      { input: { otp: '123456' } },
      { auth: true },
    );
  });

  it('resends the OTP', async () => {
    mockRequest.mockResolvedValue({ requestAccountDeletionOtp: { ok: true } });
    renderWithProviders(<DeleteAccountDialog open onClose={jest.fn()} onDeleted={jest.fn()} />);
    fireEvent.press(screen.getByTestId('delete-account-resend'));
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(MobileRequestAccountDeletionOtpDocument, undefined, {
        auth: true,
      }),
    );
  });

  it('surfaces a resend error and a delete error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('rate limited'));
    renderWithProviders(<DeleteAccountDialog open onClose={jest.fn()} onDeleted={jest.fn()} />);
    fireEvent.press(screen.getByTestId('delete-account-resend'));
    await waitFor(() =>
      expect(screen.getByTestId('delete-account-error')).toHaveTextContent('rate limited'),
    );
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    mockRequest.mockRejectedValueOnce('bad');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('delete-account-error')).toHaveTextContent('Something went wrong.'),
    );
  });

  it('closes via the sheet header', () => {
    const onClose = jest.fn();
    renderWithProviders(<DeleteAccountDialog open onClose={onClose} onDeleted={jest.fn()} />);
    fireEvent.press(screen.getByTestId('delete-account-dialog-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SecuritySection', () => {
  it('opens the change-password sheet and shows the success dialog', async () => {
    mockRequest.mockResolvedValue({ requestPasswordChangeOtp: { ok: true } });
    renderWithProviders(<SecuritySection />);
    fireEvent.press(screen.getByTestId('open-change-password'));
    expect(screen.getByTestId('current-password-submit')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('field-current_password'), 'OldPass123');
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() => expect(screen.getByTestId('field-otp')).toBeOnTheScreen());
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    fireEvent.changeText(screen.getByTestId('field-new_password'), 'StrongPass123');
    fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'StrongPass123');
    fireEvent.press(screen.getByTestId('new-password-submit'));
    await waitFor(() => expect(screen.getByTestId('password-changed-dialog')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('password-changed-dialog-confirm'));
  });

  it('confirms deletion, requests the OTP, deletes, then logs out', async () => {
    mockRequest.mockResolvedValue({ requestAccountDeletionOtp: { ok: true } });
    renderWithProviders(<SecuritySection />);
    fireEvent.press(screen.getByTestId('open-delete-account'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.getByTestId('delete-account-submit')).toBeOnTheScreen());
    expect(mockRequest).toHaveBeenCalledWith(MobileRequestAccountDeletionOtpDocument, undefined, {
      auth: true,
    });

    mockRequest.mockResolvedValueOnce({ deleteMyAccount: true });
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    fireEvent.press(screen.getByTestId('delete-account-submit'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('closes the delete sheet via its header', async () => {
    mockRequest.mockResolvedValue({ requestAccountDeletionOtp: { ok: true } });
    renderWithProviders(<SecuritySection />);
    fireEvent.press(screen.getByTestId('open-delete-account'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => expect(screen.getByTestId('delete-account-submit')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('delete-account-dialog-close'));
    await waitFor(() => expect(screen.queryByTestId('delete-account-submit')).toBeNull());
  });

  it('surfaces a deletion-request error and cancels the confirm', async () => {
    mockRequest.mockRejectedValueOnce('boom');
    renderWithProviders(<SecuritySection />);
    fireEvent.press(screen.getByTestId('open-delete-account'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('security-section-error')).toHaveTextContent(
        'Something went wrong.',
      ),
    );
    fireEvent.press(screen.getByTestId('open-delete-account'));
    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));
    expect(screen.queryByTestId('delete-account-submit')).toBeNull();
  });

  it('surfaces an Error message from a failed deletion request', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Too many requests'));
    renderWithProviders(<SecuritySection />);
    fireEvent.press(screen.getByTestId('open-delete-account'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('security-section-error')).toHaveTextContent('Too many requests'),
    );
  });

  it('closes the success dialog via cancel', async () => {
    mockRequest.mockResolvedValue({ requestPasswordChangeOtp: { ok: true } });
    renderWithProviders(<SecuritySection />);
    fireEvent.press(screen.getByTestId('open-change-password'));
    fireEvent.changeText(screen.getByTestId('field-current_password'), 'OldPass123');
    fireEvent.press(screen.getByTestId('current-password-submit'));
    await waitFor(() => expect(screen.getByTestId('field-otp')).toBeOnTheScreen());
    fireEvent.changeText(screen.getByTestId('field-otp'), '123456');
    fireEvent.changeText(screen.getByTestId('field-new_password'), 'StrongPass123');
    fireEvent.changeText(screen.getByTestId('field-confirm_password'), 'StrongPass123');
    fireEvent.press(screen.getByTestId('new-password-submit'));
    await waitFor(() => expect(screen.getByTestId('password-changed-dialog')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('password-changed-dialog-cancel'));
    await waitFor(() => expect(screen.queryByTestId('password-changed-dialog')).toBeNull());
  });
});
