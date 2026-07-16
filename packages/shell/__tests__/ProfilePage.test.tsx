import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@apollo/client', () => ({ useQuery: vi.fn(), useMutation: vi.fn(), gql: (s: TemplateStringsArray) => s }));

const userCtx = vi.hoisted(() => ({ user: null as unknown, refetch: vi.fn(), logout: vi.fn() }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => userCtx }));

const branding = vi.hoisted(() => ({ appName: 'Acme' }));
vi.mock('../src/hooks/useBranding', () => ({
  useBranding: () => ({ appName: branding.appName, logoUrl: '', loading: false }),
}));

import { useMutation } from '@apollo/client';
import { ProfilePage } from '../src/chrome/ProfilePage';

const mockMutation = vi.mocked(useMutation);

beforeEach(() => {
  branding.appName = 'Acme';
  userCtx.refetch = vi.fn().mockResolvedValue(null);
  userCtx.logout = vi.fn();
});

describe('ProfilePage', () => {
  it('shows account details and saves an edited name', async () => {
    const u = userEvent.setup();
    const save = vi.fn().mockResolvedValue({});
    userCtx.user = {
      first_name: 'Ada',
      last_name: 'Lovelace',
      full_name: 'Ada Lovelace',
      email: 'ada@x.test',
      roles: ['ADMIN'],
    };
    mockMutation.mockReturnValue([save, { loading: false, error: undefined }] as never);

    render(<ProfilePage />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@x.test')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Signed in to Acme')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Edit' }));
    const first = screen.getByLabelText('First name');
    const last = screen.getByLabelText('Last name');
    expect((first as HTMLInputElement).value).toBe('Ada');
    await u.clear(first);
    await u.type(first, 'Grace');
    await u.clear(last);
    await u.type(last, 'Byron');
    await u.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(save).toHaveBeenCalledWith({ variables: { input: { first_name: 'Grace', last_name: 'Byron' } } });
    expect(userCtx.refetch).toHaveBeenCalled();
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument();
  });

  it('falls back for a null user, shows no-roles, and logs out', async () => {
    const u = userEvent.setup();
    userCtx.user = null;
    mockMutation.mockReturnValue([vi.fn(), { loading: false, error: undefined }] as never);

    render(<ProfilePage />);
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('No roles assigned.')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Edit' }));
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('');

    await u.click(screen.getByRole('button', { name: /log out/i }));
    expect(userCtx.logout).toHaveBeenCalledTimes(1);
  });

  it('surfaces a save error and disables the buttons while saving', async () => {
    const u = userEvent.setup();
    userCtx.user = { first_name: 'Ada', roles: [] };
    mockMutation.mockReturnValue([vi.fn(), { loading: true, error: { message: 'nope' } }] as never);

    render(<ProfilePage />);
    await u.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('nope')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('falls back to the Duncit brand name when branding has no app name', () => {
    branding.appName = '';
    userCtx.user = { first_name: 'Ada', roles: [] };
    mockMutation.mockReturnValue([vi.fn(), { loading: false, error: undefined }] as never);
    render(<ProfilePage />);
    expect(screen.getByText('Signed in to Duncit')).toBeInTheDocument();
  });

  it('cancels an edit back to the read view', async () => {
    const u = userEvent.setup();
    userCtx.user = { first_name: 'Ada', roles: [] };
    mockMutation.mockReturnValue([vi.fn(), { loading: false, error: undefined }] as never);

    render(<ProfilePage />);
    await u.click(screen.getByRole('button', { name: 'Edit' }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
