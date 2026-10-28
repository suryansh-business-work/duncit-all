import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteSessionValue } from '../../../shared/session';
import { SITE_URL } from '../../../shared/env';
import { UserMenu } from '../../layout/UserMenu';
import { makeMe, makeSession } from '../fixtures';

const state = vi.hoisted(() => ({ session: null as LiteSessionValue | null }));

vi.mock('../../../shared/session', () => ({
  useLiteSession: () => {
    if (!state.session) throw new Error('session not set');
    return state.session;
  },
}));

beforeEach(() => {
  state.session = makeSession({ me: makeMe({ name: 'asha Rao', email: 'asha@lite.example', is_admin: true }) });
});

describe('UserMenu', () => {
  it("is a menu button showing the admin's initial", () => {
    render(<UserMenu />);
    const button = screen.getByRole('button', { name: 'Account menu' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveTextContent('A');
  });

  it('falls back to a question mark while the account loads, and still offers sign out', async () => {
    const user = userEvent.setup();
    state.session = makeSession({ me: null });
    render(<UserMenu />);
    const button = screen.getByRole('button', { name: 'Account menu' });
    expect(button).toHaveTextContent('?');
    await user.click(button);
    expect(await screen.findByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('shows the avatar photo when the account has one', () => {
    state.session = makeSession({ me: makeMe({ name: '  ', avatar_url: 'https://img.example.com/me.png' }) });
    const { container } = render(<UserMenu />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://img.example.com/me.png');
  });

  it('opens on who is signed in, with the site link in a new tab', async () => {
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    const menu = await screen.findByRole('menu');
    const button = screen.getByRole('button', { name: 'Account menu', hidden: true });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(button.getAttribute('aria-controls') ?? '')).toContainElement(menu);
    expect(screen.getByText('asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Signed in as asha@lite.example')).toBeInTheDocument();
    const site = screen.getByRole('menuitem', { name: /Open the site/ });
    expect(site).toHaveAttribute('href', SITE_URL);
    expect(site).toHaveAttribute('target', '_blank');
    expect(site).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('signs out from the menu and closes it', async () => {
    const user = userEvent.setup();
    const signOut = vi.fn(() => Promise.resolve());
    state.session = makeSession({ signOut });
    render(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('closes from Escape without signing out', async () => {
    const user = userEvent.setup();
    const signOut = vi.fn(() => Promise.resolve());
    state.session = makeSession({ signOut });
    render(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(signOut).not.toHaveBeenCalled();
  });
});
