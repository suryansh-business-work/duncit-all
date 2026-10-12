import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import {
  rateLimitEvent,
  rateLimitOptions,
  rateLimitSystem,
} from '../mocks/rate-limit.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import RateLimitSettingsPage from '../../src/pages/rate-limiting/settings';
import RateLimitBlockedPage from '../../src/pages/rate-limiting/blocked';
import RateLimitSystemsPage from '../../src/pages/rate-limiting/systems';

const settings = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  monitor_only: false,
  default_message: 'Too many requests, slow down.',
  send_headers: true,
  log_blocks: true,
  notify_slack: false,
  exempt_roles: [],
  allow_ips: ['203.0.113.1'],
  block_ips: [],
  event_retention_days: 14,
  store: 'REDIS',
  rule_count: 4,
  active_rule_count: 3,
  event_count: 10,
  updated_at: '2026-01-01T10:00:00.000Z',
  ...over,
});

const stats = {
  store: 'MEMORY',
  blocked_24h: 42,
  monitored_24h: 9,
  top_rules: [{ label: 'Login ceiling', count: 30 }],
  top_systems: [],
};

beforeEach(() => {
  resetOps();
  ops.q = {
    RateLimitOptions: { data: { rateLimitOptions: rateLimitOptions() } },
    RateLimitSettings: { data: { rateLimitSettings: settings() } },
    RateLimitStats: { data: { rateLimitStats: stats } },
  };
});

describe('Rate limit settings page', () => {
  it('saves edited settings with address lists split', async () => {
    renderWithProviders(<RateLimitSettingsPage />);
    const retention = await screen.findByLabelText('Keep breaches for (days)');
    expect(retention).toHaveValue(14);
    fireEvent.change(retention, { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Always refuse'), { target: { value: '198.51.100.1, 198.51.100.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutation('UpdateRateLimitSettings')).toHaveBeenCalled());
    expect(mutation('UpdateRateLimitSettings').mock.calls[0][0].variables.input).toMatchObject({
      event_retention_days: 30,
      block_ips: ['198.51.100.1', '198.51.100.2'],
      allow_ips: ['203.0.113.1'],
    });
  });

  it('rejects a too-short refusal message without calling the server', async () => {
    renderWithProviders(<RateLimitSettingsPage />);
    fireEvent.change(await screen.findByLabelText('Default refusal message'), { target: { value: 'no' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Write something the refused caller will understand.')).toBeInTheDocument();
    expect(mutation('UpdateRateLimitSettings')).not.toHaveBeenCalled();
  });

  it('shows the server error when saving fails', async () => {
    ops.mut.UpdateRateLimitSettings = vi.fn().mockRejectedValue(new Error('settings locked'));
    renderWithProviders(<RateLimitSettingsPage />);
    await screen.findByLabelText('Keep breaches for (days)');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('settings locked')).toBeInTheDocument();
  });

  it('warns when limiting is off or counting in memory', async () => {
    ops.q.RateLimitSettings = { data: { rateLimitSettings: settings({ enabled: false, store: 'MEMORY' }) } };
    renderWithProviders(<RateLimitSettingsPage />);
    expect(await screen.findByText(/Rate limiting is switched off/)).toBeInTheDocument();
    expect(screen.getByText(/Counters are held in each server process/)).toBeInTheDocument();
  });

  it('resets live counters only after confirmation, and reports a failure', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    renderWithProviders(<RateLimitSettingsPage />);
    const reset = await screen.findByRole('button', { name: 'Reset live counters' });
    fireEvent.click(reset);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('ResetRateLimitCounters')).not.toHaveBeenCalled();
    fireEvent.click(reset);
    expect(await screen.findByText('Counters reset')).toBeInTheDocument();
    mutation('ResetRateLimitCounters').mockRejectedValueOnce(new Error('redis down'));
    fireEvent.click(reset);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('redis down'));
  });

  it('shows the query error', async () => {
    ops.q.RateLimitSettings = { error: new Error('forbidden') };
    renderWithProviders(<RateLimitSettingsPage />);
    expect(await screen.findByText('forbidden')).toBeInTheDocument();
  });
});

describe('Rate limit settings page edge cases', () => {
  it('sends the flipped master switch', async () => {
    renderWithProviders(<RateLimitSettingsPage />);
    await screen.findByLabelText('Keep breaches for (days)');
    const [master] = screen.getAllByRole('switch');
    expect(master).toBeChecked();
    fireEvent.click(master);
    expect(master).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mutation('UpdateRateLimitSettings')).toHaveBeenCalled());
    expect(mutation('UpdateRateLimitSettings').mock.calls[0][0].variables.input).toMatchObject({ enabled: false });
  });

  it('shows the generic message when saving fails with a non-Error', async () => {
    ops.mut.UpdateRateLimitSettings = vi.fn().mockRejectedValue('boom');
    renderWithProviders(<RateLimitSettingsPage />);
    await screen.findByLabelText('Keep breaches for (days)');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Could not save. Please try again.')).toBeInTheDocument();
  });

  it('uses the generic message when a counter reset fails with a non-Error', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.ResetRateLimitCounters = vi.fn().mockRejectedValue('boom');
    renderWithProviders(<RateLimitSettingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reset live counters' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('Could not save. Please try again.'));
  });

  it('shows nothing but the loader on the first load', () => {
    ops.q.RateLimitSettings = { loading: true };
    renderWithProviders(<RateLimitSettingsPage />);
    expect(screen.queryByLabelText('Keep breaches for (days)')).not.toBeInTheDocument();
  });
});

describe('Rate limit blocked page', () => {
  it('lists breaches with who, what and the stats strip', async () => {
    ops.tableRows = [
      rateLimitEvent(),
      rateLimitEvent({ id: 'ev2', mode: 'MONITOR', operation: null, method: 'POST', path: '/upload', user_email: null }),
    ];
    renderWithProviders(<RateLimitBlockedPage />);
    expect(await screen.findAllByText('203.0.113.9')).not.toHaveLength(0);
    expect(screen.getByText('user@example.test')).toBeInTheDocument();
    expect(screen.getByText('POST /upload')).toBeInTheDocument();
    expect(screen.getAllByText('21 / 20s')).toHaveLength(2);
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('Login ceiling · 30')).toBeInTheDocument();
  });

  it('clears breaches only after confirmation', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWithProviders(<RateLimitBlockedPage />);
    const clear = await screen.findByRole('button', { name: 'Clear recorded breaches' });
    fireEvent.click(clear);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('ClearRateLimitEvents')).not.toHaveBeenCalled();
    fireEvent.click(clear);
    await waitFor(() => expect(mutation('ClearRateLimitEvents')).toHaveBeenCalledTimes(1));
  });

  it('reports a failed clear', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.ClearRateLimitEvents = vi.fn().mockRejectedValue(new Error('cannot clear'));
    renderWithProviders(<RateLimitBlockedPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clear recorded breaches' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('cannot clear'));
  });
});

describe('Rate limit blocked page edge cases', () => {
  it('describes a call by its method and path, or by whichever of them exists', async () => {
    ops.tableRows = [
      rateLimitEvent({ id: 'a', operation: null, method: 'GET', path: '/health', limit_key: 'k-a' }),
      rateLimitEvent({ id: 'b', operation: null, method: null, path: '/only-path', limit_key: 'k-b' }),
      rateLimitEvent({ id: 'c', operation: null, method: 'DELETE', path: null, limit_key: 'k-c' }),
    ];
    renderWithProviders(<RateLimitBlockedPage />);
    expect(await screen.findByText('GET /health')).toBeInTheDocument();
    expect(screen.getByText('/only-path')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  it('still lists breaches while the filter options have not loaded', async () => {
    delete ops.q.RateLimitOptions;
    ops.tableRows = [rateLimitEvent()];
    renderWithProviders(<RateLimitBlockedPage />);
    expect(await screen.findByText('user@example.test')).toBeInTheDocument();
  });

  it('shows the generic message when clearing fails with a non-Error', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.ClearRateLimitEvents = vi.fn().mockRejectedValue('boom');
    renderWithProviders(<RateLimitBlockedPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clear recorded breaches' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('Could not save. Please try again.'));
  });

  it('shows the shared-store hint and no memory warning when counters are in Redis', async () => {
    ops.q.RateLimitStats = { data: { rateLimitStats: { ...stats, store: 'REDIS', top_rules: [], top_systems: [] } } };
    renderWithProviders(<RateLimitBlockedPage />);
    expect(await screen.findByText(/shared/i)).toBeInTheDocument();
  });
});

describe('Rate limit systems page', () => {
  it('lists systems and flags the ungoverned ones', async () => {
    ops.q.RateLimitSystems = {
      data: {
        rateLimitSystems: [
          rateLimitSystem(),
          rateLimitSystem({ id: 'sys2', label: '', app: 'portal-x', surface: 'PORTAL', rule_count: 0, blocked: 0 }),
        ],
      },
    };
    renderWithProviders(<RateLimitSystemsPage />);
    expect(await screen.findByText('Duncit web')).toBeInTheDocument();
    expect(screen.getByText(/1 system\(s\) have no enabled rule/)).toBeInTheDocument();
    const row = screen.getAllByText('portal-x')[0].closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('None')).toBeInTheDocument();
  });

  it('shows the query error', async () => {
    ops.q.RateLimitSystems = { error: new Error('systems down') };
    renderWithProviders(<RateLimitSystemsPage />);
    expect(await screen.findByText('systems down')).toBeInTheDocument();
  });
});
