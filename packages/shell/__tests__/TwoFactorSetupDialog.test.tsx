/**
 * Turning the authenticator app on: a fresh secret per opening (never a second
 * one mid-scan), the QR code plus the key as text, a code from the app to prove
 * the scan, then the recovery codes exactly once — and once they are on screen
 * only the button may close the dialog.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apollo = vi.hoisted(() => ({ useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

const copyToClipboard = vi.hoisted(() => vi.fn());
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  copyToClipboard,
}));

import { TwoFactorSetupDialog } from '../src/chrome/ProfilePage/security/two-factor/TwoFactorSetupDialog';
import { ENABLE_TWO_FACTOR, START_TWO_FACTOR_SETUP } from '../src/chrome/ProfilePage/queries';

const startSetup = vi.fn();
const enable = vi.fn();
const state = { starting: false, enabling: false };
const SETUP = { secret: 'JBSWY3DPEHPK3PXP', qr_code_data_url: 'data:image/png;base64,QR1' };
const CODES = ['AAAA-BBBB', 'CCCC-DDDD'];

beforeEach(() => {
  state.starting = false;
  state.enabling = false;
  startSetup.mockReset().mockResolvedValue({ data: { startTwoFactorSetup: SETUP } });
  enable.mockReset().mockResolvedValue({ data: { enableTwoFactor: { recovery_codes: CODES } } });
  copyToClipboard.mockReset().mockResolvedValue(true);
  // A new function identity on every render, as Apollo may hand out: the dialog
  // must still ask for ONE secret per opening.
  apollo.useMutation.mockReset().mockImplementation((doc: unknown) => {
    if (doc === START_TWO_FACTOR_SETUP) return [() => startSetup(), { loading: state.starting }];
    if (doc === ENABLE_TWO_FACTOR) return [(o: unknown) => enable(o), { loading: state.enabling }];
    throw new Error('unexpected document');
  });
});

const mount = (open = true) => {
  const props = { onClose: vi.fn(), onEnabled: vi.fn() };
  const view = render(<TwoFactorSetupDialog open={open} {...props} />);
  const reopen = (next: boolean) => view.rerender(<TwoFactorSetupDialog open={next} {...props} />);
  return { ...props, reopen };
};

const proveScan = async (u: ReturnType<typeof userEvent.setup>, code = '123456') => {
  await u.type(await screen.findByLabelText(/6-digit code/), code);
  await u.click(screen.getByTestId('two-factor-enable-submit'));
};

describe('TwoFactorSetupDialog — the secret', () => {
  it('asks for nothing while closed', () => {
    mount(false);
    expect(startSetup).not.toHaveBeenCalled();
    expect(screen.queryByTestId('two-factor-setup-dialog')).not.toBeInTheDocument();
  });

  it('shows a placeholder while the secret is on its way', () => {
    state.starting = true;
    startSetup.mockReturnValue(new Promise(() => undefined));
    mount();

    const dialog = screen.getByRole('dialog', { name: 'Set up authenticator app' });
    expect(dialog.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(within(dialog).getByTestId('two-factor-setup-close')).toHaveTextContent('Cancel');
  });

  it('shows the QR code and the key as text, asks only for an app code, and asks once', async () => {
    mount();

    const qr = await screen.findByTestId('two-factor-qr');
    expect(qr).toHaveAttribute('src', SETUP.qr_code_data_url);
    expect(qr).toHaveAccessibleName('QR code to add your account to an authenticator app');
    expect(screen.getByTestId('two-factor-secret')).toHaveTextContent(SETUP.secret);
    expect(screen.getByLabelText(/6-digit code/)).toHaveAttribute('maxlength', '6');
    expect(screen.getByTestId('two-factor-enable-submit')).toHaveTextContent('Turn on');
    expect(startSetup).toHaveBeenCalledTimes(1);
  });

  it('shows no scan step when the server answers without a secret', async () => {
    startSetup.mockResolvedValue({ data: undefined });
    mount();

    await waitFor(() => expect(startSetup).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('two-factor-qr')).not.toBeInTheDocument();
    expect(screen.queryByTestId('two-factor-setup-error')).not.toBeInTheDocument();
  });

  it('says why the secret could not be made, and Retry asks again', async () => {
    const u = userEvent.setup();
    startSetup.mockRejectedValueOnce(new Error('Setup is unavailable right now'));
    mount();

    expect(await screen.findByTestId('two-factor-setup-error')).toHaveTextContent('Setup is unavailable right now');
    await u.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('two-factor-qr')).toBeInTheDocument();
    expect(screen.queryByTestId('two-factor-setup-error')).not.toBeInTheDocument();
    expect(startSetup).toHaveBeenCalledTimes(2);
  });

  it('Escape before the codes closes it, and reopening asks for a fresh secret', async () => {
    const u = userEvent.setup();
    const { onClose, reopen } = mount();
    await screen.findByTestId('two-factor-qr');

    await u.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    reopen(false);
    startSetup.mockResolvedValue({ data: { startTwoFactorSetup: { ...SETUP, secret: 'NEWSECRET234567' } } });
    reopen(true);

    expect(await screen.findByText('NEWSECRET234567')).toBeInTheDocument();
    expect(startSetup).toHaveBeenCalledTimes(2);
  });
});

describe('TwoFactorSetupDialog — proving the scan', () => {
  it('turns it on with the right code and shows the recovery codes once', async () => {
    const u = userEvent.setup();
    const { onEnabled, onClose } = mount();
    await proveScan(u);

    const dialog = await screen.findByRole('dialog', { name: 'Save your recovery codes' });
    expect(enable).toHaveBeenCalledWith({ variables: { code: '123456' } });
    expect(onEnabled).toHaveBeenCalledTimes(1);
    const list = within(dialog).getByRole('list', { name: 'Save your recovery codes' });
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(CODES);
    expect(within(dialog).getByText(/they will not be shown again/)).toBeInTheDocument();
    expect(screen.queryByTestId('two-factor-qr')).not.toBeInTheDocument();

    // A stray Escape must not throw away the only copy.
    await u.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    await u.click(within(dialog).getByRole('button', { name: "I've saved them" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('copies every code, one per line, and says so', async () => {
    const u = userEvent.setup();
    mount();
    await proveScan(u);

    await u.click(await screen.findByTestId('two-factor-recovery-copy'));

    expect(copyToClipboard).toHaveBeenCalledWith('AAAA-BBBB\nCCCC-DDDD');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied'));
  });

  it('tells the reader to copy by hand when the clipboard refuses', async () => {
    const u = userEvent.setup();
    copyToClipboard.mockResolvedValue(false);
    mount();
    await proveScan(u);

    await u.click(await screen.findByTestId('two-factor-recovery-copy'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Could not copy — select and copy them instead.'),
    );
  });

  it('keeps the scan step and shows why when the code is refused', async () => {
    const u = userEvent.setup();
    enable.mockRejectedValue(new Error('That code is not right'));
    const { onEnabled } = mount();
    await proveScan(u, '000000');

    expect(await screen.findByTestId('two-factor-enable-error')).toHaveTextContent('That code is not right');
    expect(screen.getByTestId('two-factor-qr')).toBeInTheDocument();
    expect(onEnabled).not.toHaveBeenCalled();
  });

  it('still moves on, with an empty list, when the answer carries no codes', async () => {
    const u = userEvent.setup();
    enable.mockResolvedValue({});
    const { onEnabled } = mount();
    await proveScan(u);

    const list = await screen.findByTestId('two-factor-recovery-codes');
    expect(within(list).queryAllByRole('listitem')).toHaveLength(0);
    expect(onEnabled).toHaveBeenCalledTimes(1);
  });

  it('says it is checking while the code is verified', async () => {
    state.enabling = true;
    mount();

    const submit = await screen.findByTestId('two-factor-enable-submit');
    expect(submit).toHaveTextContent('Checking…');
    expect(submit).toBeDisabled();
  });
});
