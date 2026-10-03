/**
 * Profile > Security's authenticator-app card: whether it is on, since when and
 * how many recovery codes are left, the right door for each state, and turning
 * it off — which takes a current or recovery code, never just the open session.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apollo = vi.hoisted(() => ({ useMutation: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (iso: string) => `fmt(${iso})` }),
}));

import { TwoFactorSection } from '../src/chrome/ProfilePage/security/two-factor/TwoFactorSection';
import { DISABLE_TWO_FACTOR, START_TWO_FACTOR_SETUP } from '../src/chrome/ProfilePage/queries';

type Accounts = Parameters<typeof TwoFactorSection>[0]['accounts'];

const disable = vi.fn();
const startSetup = vi.fn();
const disabling = { value: false };
const OFF: Accounts = { two_factor_enabled: false, two_factor_enabled_at: null, two_factor_recovery_codes_left: 0 };
const ON: Accounts = {
  two_factor_enabled: true,
  two_factor_enabled_at: '2026-09-01T10:00:00Z',
  two_factor_recovery_codes_left: 7,
};

beforeEach(() => {
  disabling.value = false;
  disable.mockReset().mockResolvedValue({ data: { disableTwoFactor: { two_factor_enabled: false } } });
  startSetup.mockReset().mockReturnValue(new Promise(() => undefined));
  apollo.useMutation.mockReset().mockImplementation((doc: unknown) => {
    if (doc === DISABLE_TWO_FACTOR) return [disable, { loading: disabling.value }];
    if (doc === START_TWO_FACTOR_SETUP) return [startSetup, { loading: true }];
    return [vi.fn(), { loading: false }];
  });
});

const mount = (accounts: Accounts) => {
  const onChanged = vi.fn();
  render(<TwoFactorSection accounts={accounts} onChanged={onChanged} />);
  return onChanged;
};

describe('TwoFactorSection — state', () => {
  it('reads Off with no status line and offers to set it up', () => {
    mount(OFF);
    const section = screen.getByRole('region', { name: 'Authenticator app' });

    expect(within(section).getByTestId('profile-two-factor-state')).toHaveTextContent('Off');
    expect(within(section).getByTestId('profile-two-factor-state')).toHaveClass('MuiChip-outlined');
    expect(within(section).queryByTestId('profile-two-factor-status')).not.toBeInTheDocument();
    expect(within(section).getByTestId('profile-two-factor-setup')).toHaveTextContent('Set up authenticator app');
    expect(within(section).queryByTestId('profile-two-factor-disable')).not.toBeInTheDocument();
  });

  it('reads On, since when, and how many recovery codes are left, and offers to turn it off', () => {
    mount(ON);

    expect(screen.getByTestId('profile-two-factor-state')).toHaveTextContent('On');
    expect(screen.getByTestId('profile-two-factor-state')).toHaveClass('MuiChip-filled');
    expect(screen.getByTestId('profile-two-factor-status')).toHaveTextContent(
      'On since fmt(2026-09-01T10:00:00Z). Recovery codes left: 7.',
    );
    expect(screen.getByTestId('profile-two-factor-disable')).toHaveTextContent('Turn off');
  });

  it('says simply On when the server has no switch-on date', () => {
    mount({ ...ON, two_factor_enabled_at: null, two_factor_recovery_codes_left: 3 });

    expect(screen.getByTestId('profile-two-factor-status')).toHaveTextContent(/^On Recovery codes left: 3\.$/);
  });
});

describe('TwoFactorSection — setting up', () => {
  it('opens the setup dialog, and Cancel closes it again', async () => {
    const u = userEvent.setup();
    mount(OFF);

    await u.click(screen.getByTestId('profile-two-factor-setup'));
    expect(await screen.findByRole('dialog', { name: 'Set up authenticator app' })).toBeInTheDocument();
    expect(startSetup).toHaveBeenCalledTimes(1);

    await u.click(screen.getByTestId('two-factor-setup-close'));
    await waitFor(() => expect(screen.queryByTestId('two-factor-setup-dialog')).not.toBeInTheDocument());
  });
});

describe('TwoFactorSection — turning it off', () => {
  const openDisable = async (u: ReturnType<typeof userEvent.setup>) => {
    await u.click(screen.getByTestId('profile-two-factor-disable'));
    return screen.findByRole('dialog', { name: 'Turn off authenticator app?' });
  };

  it('turns it off with a current code, reloads the facts and closes', async () => {
    const u = userEvent.setup();
    const onChanged = mount(ON);
    const dialog = await openDisable(u);

    expect(within(dialog).getByText(/or a recovery code, to confirm/)).toBeInTheDocument();
    await u.type(within(dialog).getByLabelText(/^Code/), '123456');
    await u.click(within(dialog).getByTestId('two-factor-disable-submit'));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(disable).toHaveBeenCalledWith({ variables: { code: '123456' } });
    await waitFor(() => expect(screen.queryByTestId('two-factor-disable-dialog')).not.toBeInTheDocument());
  });

  it('accepts a recovery code for a lost phone', async () => {
    const u = userEvent.setup();
    mount(ON);
    const dialog = await openDisable(u);

    await u.type(within(dialog).getByLabelText(/^Code/), 'ABCD-EFGH');
    await u.click(within(dialog).getByTestId('two-factor-disable-submit'));

    await waitFor(() => expect(disable).toHaveBeenCalledWith({ variables: { code: 'ABCD-EFGH' } }));
  });

  it('stays on, with the reason under the box, when the code is refused', async () => {
    const u = userEvent.setup();
    disable.mockRejectedValue(new Error('That code is not right'));
    const onChanged = mount(ON);
    const dialog = await openDisable(u);

    await u.type(within(dialog).getByLabelText(/^Code/), '000000');
    await u.click(within(dialog).getByTestId('two-factor-disable-submit'));

    expect(await within(dialog).findByTestId('two-factor-disable-error')).toHaveTextContent('That code is not right');
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByTestId('two-factor-disable-dialog')).toBeInTheDocument();
  });

  it('Cancel closes without asking the server', async () => {
    const u = userEvent.setup();
    const onChanged = mount(ON);
    const dialog = await openDisable(u);

    await u.click(within(dialog).getByTestId('two-factor-disable-cancel'));

    await waitFor(() => expect(screen.queryByTestId('two-factor-disable-dialog')).not.toBeInTheDocument());
    expect(disable).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('says it is checking while the code is verified', async () => {
    const u = userEvent.setup();
    disabling.value = true;
    mount(ON);
    const dialog = await openDisable(u);

    expect(within(dialog).getByTestId('two-factor-disable-submit')).toHaveTextContent('Checking…');
    expect(within(dialog).getByTestId('two-factor-disable-submit')).toBeDisabled();
  });
});
