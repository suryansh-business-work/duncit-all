import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildPasswordRecoveryLabels } from '@duncit/utils';

import RecoveryCodeStep from '../RecoveryCodeStep';
import RecoveryPasswordStep from '../../../pages/forgot-password-page/RecoveryPasswordStep';
import { fallbackT } from '../../../i18n/fallback';

const labels = buildPasswordRecoveryLabels(fallbackT);

const typeInto = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId).querySelector('input') as HTMLInputElement, { target: { value } });

function renderCode(over: Partial<Parameters<typeof RecoveryCodeStep>[0]> = {}) {
  const onVerify = vi.fn();
  const onResend = vi.fn();
  render(
    <RecoveryCodeStep
      labels={labels}
      destination="r***@example.test"
      expiresInMinutes={10}
      testCode={null}
      busy={false}
      resending={false}
      resendIn={0}
      onVerify={onVerify}
      onResend={onResend}
      {...over}
    />,
  );
  return { onVerify, onResend };
}

describe('RecoveryCodeStep', () => {
  it('names where the code went and keeps verify shut until six digits are typed', async () => {
    const { onVerify } = renderCode();
    expect(screen.getByText(labels.codeSubtitle('r***@example.test'))).toBeInTheDocument();
    expect(screen.getByText(labels.codeExpiry(10))).toBeInTheDocument();
    expect(screen.getByTestId('recovery-verify-code')).toBeDisabled();
    typeInto('recovery-otp', '12');
    expect(screen.getByTestId('recovery-verify-code')).toBeDisabled();
    typeInto('recovery-otp', '482913');
    await waitFor(() => expect(screen.getByTestId('recovery-verify-code')).toBeEnabled());
    fireEvent.click(screen.getByTestId('recovery-verify-code'));
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('482913'));
  });

  it('echoes the code only when one is handed in', () => {
    const { unmount } = render(
      <RecoveryCodeStep
        labels={labels}
        destination="x"
        expiresInMinutes={5}
        testCode="999111"
        busy={false}
        resending={false}
        resendIn={0}
        onVerify={vi.fn()}
        onResend={vi.fn()}
      />,
    );
    expect(screen.getByTestId('recovery-test-code')).toHaveTextContent('999111');
    unmount();
    renderCode();
    expect(screen.queryByTestId('recovery-test-code')).not.toBeInTheDocument();
  });

  it('resends on request', () => {
    const { onResend } = renderCode();
    fireEvent.click(screen.getByTestId('recovery-resend'));
    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it('shuts the resend link during the cooldown and while resending', () => {
    const { unmount } = render(
      <RecoveryCodeStep labels={labels} destination="x" expiresInMinutes={5} testCode={null} busy={false} resending={false} resendIn={30} onVerify={vi.fn()} onResend={vi.fn()} />,
    );
    expect(screen.getByTestId('recovery-resend')).toBeDisabled();
    expect(screen.getByTestId('recovery-resend')).toHaveTextContent(labels.resendIn(30));
    unmount();
    renderCode({ resending: true });
    expect(screen.getByTestId('recovery-resend')).toBeDisabled();
    expect(screen.getByTestId('recovery-resend')).toHaveTextContent(labels.resending);
  });

  it('shows the verifying label and shuts the button while the code is being checked', () => {
    renderCode({ busy: true });
    expect(screen.getByTestId('recovery-verify-code')).toBeDisabled();
    expect(screen.getByTestId('recovery-verify-code')).toHaveTextContent(labels.verifying);
  });
});

describe('RecoveryPasswordStep', () => {
  const STRONG = 'Str0ng!Passw0rd';

  it('keeps save shut until the two passwords are valid and match, then hands the new one on', async () => {
    const onSave = vi.fn();
    render(<RecoveryPasswordStep labels={labels} busy={false} onSave={onSave} />);
    expect(screen.getByTestId('recovery-save-password')).toBeDisabled();
    typeInto('new_password', STRONG);
    typeInto('confirm_password', `${STRONG}x`);
    await waitFor(() =>
      expect(screen.getByTestId('confirm_password').querySelector('input')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(screen.getByTestId('recovery-save-password')).toBeDisabled();
    typeInto('confirm_password', STRONG);
    await waitFor(() => expect(screen.getByTestId('recovery-save-password')).toBeEnabled());
    fireEvent.click(screen.getByTestId('recovery-save-password'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(STRONG));
  });

  it('shows and hides both boxes with one toggle', () => {
    render(<RecoveryPasswordStep labels={labels} busy={false} onSave={vi.fn()} />);
    const box = () => screen.getByTestId('new_password').querySelector('input') as HTMLInputElement;
    const confirm = () => screen.getByTestId('confirm_password').querySelector('input') as HTMLInputElement;
    expect(box()).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByTestId('recovery-password-toggle-visibility'));
    expect(box()).toHaveAttribute('type', 'text');
    expect(confirm()).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByTestId('recovery-password-toggle-visibility'));
    expect(confirm()).toHaveAttribute('type', 'password');
  });

  it('shows the saving label and stays shut while saving', () => {
    render(<RecoveryPasswordStep labels={labels} busy onSave={vi.fn()} />);
    expect(screen.getByTestId('recovery-save-password')).toBeDisabled();
    expect(screen.getByTestId('recovery-save-password')).toHaveTextContent(labels.saving);
  });
});
