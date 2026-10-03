import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ChangePasswordDialog from '../ChangePasswordDialog';
import { CHANGE_PASSWORD_WITH_OTP, REQUEST_PASSWORD_CHANGE_OTP } from '../security-queries';

/*
  The two forms are React Hook Form + Zod and have their own suite. What this
  dialog owns is what happens with their values: which mutation runs with what,
  which step shows next, and which error the form is handed back. So each form
  is stood in for by one that submits fixed values and — like the real form —
  shows the message of whatever its onSubmit throws.
*/
vi.mock('../../../forms/change-password', async () => {
  const { useState } = await import('react');
  function useSubmit(onSubmit: (v: any) => Promise<void>, values: unknown) {
    const [error, setError] = useState<string | null>(null);
    const submit = () => {
      setError(null);
      onSubmit(values).catch((e: Error) => setError(e.message));
    };
    return { error, submit };
  }
  return {
    CurrentPasswordForm: ({ onSubmit, errorMessage, loading }: any) => {
      const { error, submit } = useSubmit(onSubmit, { current_password: 'Old-pass-1' });
      return (
        <div>
          <button type="button" data-testid="current-password-submit" disabled={loading} onClick={submit}>
            submit-current
          </button>
          {(error || errorMessage) && <p data-testid="current-password-error">{error || errorMessage}</p>}
        </div>
      );
    },
    NewPasswordForm: ({ onSubmit }: any) => {
      const [next, setNext] = useState('New-pass-2');
      const { error, submit } = useSubmit(onSubmit, { otp: '123456', new_password: next, confirm_password: next });
      return (
        <div>
          <button type="button" onClick={() => setNext('Old-pass-1')}>
            reuse-current
          </button>
          <button type="button" data-testid="new-password-submit" onClick={submit}>
            submit-new
          </button>
          {error && <p data-testid="new-password-error">{error}</p>}
        </div>
      );
    },
  };
});

const requestOtpMock = (input: Record<string, string>, over: Partial<MockedResponse> = {}): MockedResponse => ({
  request: { query: REQUEST_PASSWORD_CHANGE_OTP, variables: { input } },
  result: { data: { requestPasswordChangeOtp: { ok: true } } },
  ...over,
});

const changeMock = (over: Partial<MockedResponse> = {}): MockedResponse => ({
  request: {
    query: CHANGE_PASSWORD_WITH_OTP,
    variables: { input: { otp: '123456', new_password: 'New-pass-2' } },
  },
  result: { data: { changePasswordWithOtp: true } },
  ...over,
});

function renderDialog(hasPassword: boolean, mocks: MockedResponse[]) {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ChangePasswordDialog open hasPassword={hasPassword} onClose={onClose} onChanged={onChanged} />
    </MockedProvider>,
  );
  return { onClose, onChanged };
}

describe('ChangePasswordDialog — account with a password', () => {
  it('asks for the current password first', () => {
    renderDialog(true, []);
    expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument();
    expect(
      screen.getByText('Enter your current password and we’ll email you a one-time code.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('change-password-send-code')).not.toBeInTheDocument();
  });

  it('sends the code with the current password, then changes it with the OTP', async () => {
    const { onChanged, onClose } = renderDialog(true, [
      requestOtpMock({ current_password: 'Old-pass-1' }),
      changeMock(),
    ]);

    fireEvent.click(screen.getByTestId('current-password-submit'));
    expect(await screen.findByTestId('change-password-info')).toHaveTextContent('OTP sent to your email.');

    fireEvent.click(screen.getByTestId('new-password-submit'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hands the server’s reason back to the current-password form', async () => {
    renderDialog(true, [
      requestOtpMock({ current_password: 'Old-pass-1' }, { result: { errors: [{ message: 'Current password is incorrect' }] } }),
    ]);

    fireEvent.click(screen.getByTestId('current-password-submit'));
    expect(await screen.findByTestId('current-password-error')).toHaveTextContent('Current password is incorrect');
    expect(screen.queryByTestId('change-password-info')).not.toBeInTheDocument();
  });

  it('refuses a new password equal to the current one without calling the server', async () => {
    const { onChanged } = renderDialog(true, [requestOtpMock({ current_password: 'Old-pass-1' })]);

    fireEvent.click(screen.getByTestId('current-password-submit'));
    await screen.findByTestId('change-password-info');

    fireEvent.click(screen.getByRole('button', { name: 'reuse-current' }));
    fireEvent.click(screen.getByTestId('new-password-submit'));
    expect(await screen.findByTestId('new-password-error')).toHaveTextContent(
      'New password must be different from your current password',
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('reports a rejected OTP on the new-password form and stays open', async () => {
    const { onChanged, onClose } = renderDialog(true, [
      requestOtpMock({ current_password: 'Old-pass-1' }),
      changeMock({ result: { errors: [{ message: 'Invalid or expired OTP' }] } }),
    ]);

    fireEvent.click(screen.getByTestId('current-password-submit'));
    await screen.findByTestId('change-password-info');
    fireEvent.click(screen.getByTestId('new-password-submit'));

    expect(await screen.findByTestId('new-password-error')).toHaveTextContent('Invalid or expired OTP');
    expect(onChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('resends the code with the same current password', async () => {
    const sent = vi.fn();
    renderDialog(true, [
      requestOtpMock({ current_password: 'Old-pass-1' }),
      {
        request: {
          query: REQUEST_PASSWORD_CHANGE_OTP,
          variables: (vars: Record<string, unknown>) => {
            sent(vars);
            return true;
          },
        },
        result: { data: { requestPasswordChangeOtp: { ok: true } } },
      },
    ]);

    fireEvent.click(screen.getByTestId('current-password-submit'));
    await screen.findByTestId('change-password-info');
    fireEvent.click(screen.getByTestId('change-password-resend'));

    await waitFor(() => expect(sent).toHaveBeenCalledWith({ input: { current_password: 'Old-pass-1' } }));
    expect(screen.getByTestId('change-password-info')).toHaveTextContent('OTP sent to your email.');
  });

  it('shows why a resend failed in place of the sent notice', async () => {
    renderDialog(true, [
      requestOtpMock({ current_password: 'Old-pass-1' }),
      requestOtpMock({ current_password: 'Old-pass-1' }, { result: { errors: [{ message: 'Please wait before resending' }] } }),
    ]);

    fireEvent.click(screen.getByTestId('current-password-submit'));
    await screen.findByTestId('change-password-info');
    fireEvent.click(screen.getByTestId('change-password-resend'));

    await waitFor(() =>
      expect(screen.getByTestId('change-password-info')).toHaveTextContent('Please wait before resending'),
    );
  });
});

describe('ChangePasswordDialog — account without a password', () => {
  it('offers to send a code instead of asking for a password', () => {
    renderDialog(false, []);
    expect(screen.getByRole('heading', { name: 'Create password' })).toBeInTheDocument();
    expect(screen.getByTestId('change-password-send-code')).toHaveTextContent('Send code');
    expect(screen.queryByTestId('current-password-submit')).not.toBeInTheDocument();
  });

  it('requests the code with no current password and moves to the OTP step', async () => {
    renderDialog(false, [requestOtpMock({})]);
    fireEvent.click(screen.getByTestId('change-password-send-code'));
    expect(await screen.findByTestId('change-password-info')).toHaveTextContent('OTP sent to your email.');
    expect(screen.getByTestId('new-password-submit')).toBeInTheDocument();
  });

  it('shows the error under the send button when the code cannot be sent', async () => {
    renderDialog(false, [requestOtpMock({}, { result: { errors: [{ message: 'Email not verified' }] } })]);
    fireEvent.click(screen.getByTestId('change-password-send-code'));
    expect(await screen.findByTestId('create-password-error')).toHaveTextContent('Email not verified');
    expect(screen.getByTestId('change-password-send-code')).toBeEnabled();
  });
});

describe('ChangePasswordDialog — closing', () => {
  it('starts again from step one after being closed with Escape', async () => {
    const { onClose } = renderDialog(true, [requestOtpMock({ current_password: 'Old-pass-1' })]);
    fireEvent.click(screen.getByTestId('current-password-submit'));
    await screen.findByTestId('change-password-info');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // The parent still holds it open here, so the reset is visible at once.
    expect(screen.getByTestId('current-password-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('change-password-info')).not.toBeInTheDocument();
  });
});
