import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import TableApiSettingsPage from '../../src/pages/table-api-settings';

const access = (over: Record<string, unknown> = {}) => ({
  token: 'tok_abc123',
  base_url: 'https://api.example.test/table',
  created_at: '2026-03-01T09:00:00.000Z',
  last_used_at: '2026-03-02T09:00:00.000Z',
  ...over,
});

const seed = (over: Record<string, unknown> = {}) => {
  ops.q.MyTableApiAccess = { data: { myTableApiAccess: access(over) } };
};

beforeEach(() => {
  resetOps();
  seed();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Table API settings', () => {
  it('shows the token, when it was issued and used, and a ready-made sample URL', () => {
    renderWithProviders(<TableApiSettingsPage />);
    expect(screen.getByTestId('table-api-token')).toHaveTextContent('tok_abc123');
    expect(screen.getByText(/Issued .* · last used /)).toBeInTheDocument();
    expect(
      screen.getByText('GET https://api.example.test/table/myApiKeysTable?token=tok_abc123&page=1&page_size=25')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotate token' })).toBeEnabled();
  });

  it('says a token that was never used is never used', () => {
    seed({ last_used_at: null });
    renderWithProviders(<TableApiSettingsPage />);
    expect(screen.getByText(/· never used/)).toBeInTheDocument();
  });

  it('offers only Generate when there is no token, and hides the sample and dates', async () => {
    seed({ token: null, created_at: null, last_used_at: null });
    renderWithProviders(<TableApiSettingsPage />);
    expect(screen.getByTestId('table-api-token')).toHaveTextContent('No token yet');
    expect(screen.getByRole('button', { name: 'Copy token' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Revoke token' })).toBeDisabled();
    expect(screen.queryByText(/^GET /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Issued/)).not.toBeInTheDocument();

    // First issue needs no confirmation: there is no URL to break yet.
    fireEvent.click(screen.getByRole('button', { name: 'Generate token' }));
    await waitFor(() => expect(mutation('RotateMyTableApiToken')).toHaveBeenCalledTimes(1));
    expect(ops.confirm).not.toHaveBeenCalled();
    expect(ops.notify).toHaveBeenCalledWith(
      'New token ready. Copy fresh GET URLs wherever you use them.',
      'success'
    );
  });

  it('asks before rotating an existing token and does nothing when declined', async () => {
    ops.confirm.mockResolvedValue(false);
    renderWithProviders(<TableApiSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Rotate token' }));
    await waitFor(() =>
      expect(ops.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Rotate your table API token?', destructive: true })
      )
    );
    expect(mutation('RotateMyTableApiToken')).not.toHaveBeenCalled();
    expect(ops.notify).not.toHaveBeenCalled();
  });

  it('rotates after confirmation', async () => {
    ops.confirm.mockResolvedValue(true);
    renderWithProviders(<TableApiSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Rotate token' }));
    await waitFor(() => expect(mutation('RotateMyTableApiToken')).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith(expect.stringContaining('New token ready'), 'success'));
  });

  it('reports a failed rotate and does not claim success', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.RotateMyTableApiToken = vi.fn().mockRejectedValue(new Error('rate limited'));
    renderWithProviders(<TableApiSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Rotate token' }));
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(ops.notify).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('revokes after confirmation, and leaves the token alone when declined', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWithProviders(<TableApiSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('RevokeMyTableApiToken')).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }));
    await waitFor(() => expect(mutation('RevokeMyTableApiToken')).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(ops.notify).toHaveBeenCalledWith(
        'Token revoked. Every GET URL built from it has stopped working.',
        'success'
      )
    );
  });

  it('reports a failed revoke', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.RevokeMyTableApiToken = vi.fn().mockRejectedValue(new Error('nope'));
    renderWithProviders(<TableApiSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }));
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(ops.notify).not.toHaveBeenCalledWith(expect.anything(), 'success');
  });

  it('disables rotate and revoke while a mutation is in flight', () => {
    ops.mutLoading.RotateMyTableApiToken = true;
    renderWithProviders(<TableApiSettingsPage />);
    expect(screen.getByRole('button', { name: 'Rotate token' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Revoke token' })).toBeDisabled();
  });

  it('copies the token to the clipboard and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderWithProviders(<TableApiSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy token' }));
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith('Token copied', 'success'));
    expect(writeText).toHaveBeenCalledWith('tok_abc123');
  });

  it('says so when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    renderWithProviders(<TableApiSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy token' }));
    await waitFor(() => expect(ops.notify).toHaveBeenCalledWith('Could not copy the token', 'error'));
  });

  it('shows the error instead of the card when the query fails', () => {
    ops.q.MyTableApiAccess = { error: new Error('Not allowed to read this') };
    renderWithProviders(<TableApiSettingsPage />);
    expect(screen.getByText(/Not allowed to read this/)).toBeInTheDocument();
    expect(screen.queryByTestId('table-api-token')).not.toBeInTheDocument();
  });

  it('renders the empty state, not a crash, when the query returns nothing yet', () => {
    ops.q.MyTableApiAccess = { loading: true };
    renderWithProviders(<TableApiSettingsPage />);
    expect(screen.queryByTestId('table-api-token')).not.toBeInTheDocument();
  });

  it('treats a response without access as no token', () => {
    ops.q.MyTableApiAccess = { data: undefined };
    renderWithProviders(<TableApiSettingsPage />);
    expect(screen.getByTestId('table-api-token')).toHaveTextContent('No token yet');
    expect(screen.getByRole('button', { name: 'Generate token' })).toBeEnabled();
  });
});
