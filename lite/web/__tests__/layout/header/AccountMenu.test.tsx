import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../../shared/env';
import { LITE_SETTINGS } from '../../../../shared/graphql/documents';
import { SignInDialog } from '../../../components/auth/SignInDialog';
import { AccountMenu } from '../../../layout/header/AccountMenu';
import { TEST_TOKEN, captureNotifications, meFixture, renderWithProviders, settle, storeResetMocks } from '../../test-utils';

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
  localStorage.clear();
});

describe('AccountMenu signed out', () => {
  it('offers Sign in, which opens the one sign-in dialog', async () => {
    const { user } = renderWithProviders(
      <>
        <AccountMenu />
        <SignInDialog />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('dialog', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('AccountMenu signed in', () => {
  it('is a closed menu button until pressed', () => {
    renderWithProviders(<AccountMenu />, { me: meFixture() });
    const button = screen.getByRole('button', { name: 'Account menu' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens Profile, Settings and Sign out, tied to its button', async () => {
    const { user } = renderWithProviders(<AccountMenu />, { me: meFixture() });
    const button = screen.getByRole('button', { name: 'Account menu' });

    await user.click(button);

    const menu = screen.getByRole('menu');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const controlled = document.getElementById(button.getAttribute('aria-controls') ?? '');
    expect(controlled).not.toBeNull();
    expect(controlled).toContainElement(menu);
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Asha Raoasha@example.com', 'Settings', 'Sign out']);
    expect(items[0]).toHaveAttribute('href', '/u/asha');
    expect(items[1]).toHaveAttribute('href', '/settings');
  });

  it('names a phone-only account by its number, and one with neither by its handle', async () => {
    const { user, unmount } = renderWithProviders(<AccountMenu />, { me: meFixture({ email: '', phone: '+919876543210' }) });
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByTestId('account-menu-profile')).toHaveTextContent('+919876543210');
    unmount();

    const second = renderWithProviders(<AccountMenu />, { me: meFixture({ email: '', phone: null }) });
    await second.user.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByTestId('account-menu-profile')).toHaveTextContent('@asha');
  });

  it('goes to Settings and closes', async () => {
    const { user, router } = renderWithProviders(<AccountMenu />, { me: meFixture() });
    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    await user.click(screen.getByRole('menuitem', { name: 'Settings' }));

    expect(router.state.location.pathname).toBe('/settings');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('signs out: forgets the stored session and reloads quietly', async () => {
    const me = meFixture();
    localStorage.setItem(STORAGE_KEYS.token, TEST_TOKEN);
    const { user } = renderWithProviders(<AccountMenu />, { me, mocks: storeResetMocks(me) });
    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    await settle();
    expect(toasts.seen).toEqual([]);
  });

  it('says so when the app cannot reload after signing out', async () => {
    const { user } = renderWithProviders(<AccountMenu />, {
      me: meFixture(),
      mocks: [{ request: { query: LITE_SETTINGS }, result: { errors: [{ message: 'Settings are being updated' }] } }],
    });
    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(toasts.seen).toEqual([{ message: 'Settings are being updated', severity: 'error' }]));
  });
});
