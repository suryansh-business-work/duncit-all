import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { rateLimitOptions, rateLimitRule, rateLimitSystem } from '../mocks/rate-limit.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});

import RateLimitRulesPage from '../../src/pages/rate-limiting/rules';
import RateLimitSystemsPage from '../../src/pages/rate-limiting/systems';
import { enumLabel } from '../../src/pages/rate-limiting/labels';
import { toForm } from '../../src/pages/rate-limiting/rules/rate-limit-rule/rate-limit-rule.types';

beforeEach(() => {
  resetOps();
  ops.tableRows = [rateLimitRule()];
  ops.q = {
    RateLimitOptions: { data: { rateLimitOptions: rateLimitOptions() } },
    RateLimitSystems: { data: { rateLimitSystems: [rateLimitSystem()] } },
  };
});

describe('rate limit labels and mappers', () => {
  it('names an enum value it does not know by itself', () => {
    const t = (key: string) => key;
    expect(enumLabel(t, 'ENFORCE')).not.toBe('ENFORCE');
    expect(enumLabel(t, 'SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it('opens a rule with no description as an empty one', () => {
    expect(toForm(rateLimitRule({ description: null })).description).toBe('');
    expect(toForm(rateLimitRule({ description: 'Stops stuffing' })).description).toBe('Stops stuffing');
  });
});

describe('rate limit systems page / states', () => {
  it('shows the strip with zero counts and the in-memory store before the stats arrive', async () => {
    ops.q.RateLimitStats = { loading: true };
    renderWithProviders(<RateLimitSystemsPage />);
    expect(await screen.findByText('Duncit web')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
  });

  it('waits for the first read of the systems, and keeps the table while it refreshes', async () => {
    ops.q.RateLimitSystems = { loading: true };
    const { unmount } = renderWithProviders(<RateLimitSystemsPage />);
    expect(screen.queryByText('Duncit web')).not.toBeInTheDocument();
    unmount();

    ops.q.RateLimitSystems = { loading: true, data: { rateLimitSystems: [rateLimitSystem()] } };
    renderWithProviders(<RateLimitSystemsPage />);
    expect(await screen.findByText('Duncit web')).toBeInTheDocument();
  });
});

describe('rate limit systems / search', () => {
  it('finds a system by its label, app or surface', async () => {
    ops.q.RateLimitSystems = {
      data: { rateLimitSystems: [rateLimitSystem(), rateLimitSystem({ id: 'sys2', label: 'Partners', app: 'partners', surface: 'PORTAL' })] },
    };
    renderWithProviders(<RateLimitSystemsPage />);
    await screen.findByText('Duncit web');

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'partners' } });

    await waitFor(() => expect(screen.queryByText('Duncit web')).not.toBeInTheDocument());
    expect(screen.getByText('Partners')).toBeInTheDocument();
  });
});

describe('rate limit rule form / edges', () => {
  const openEdit = async () => {
    renderWithProviders(<RateLimitRulesPage />);
    await screen.findByText('Login ceiling');
    fireEvent.click(within((await screen.findByText('Login ceiling')).closest('[role="row"]') as HTMLElement).getByRole('button', { name: 'Edit' }));
    return screen.findByRole('dialog');
  };

  it('asks for a burst only on the token bucket, and sends it', async () => {
    ops.tableRows = [rateLimitRule({ algorithm: 'TOKEN_BUCKET', burst: 15 })];
    const dialog = await openEdit();

    expect(within(dialog).getByLabelText('Burst')).toHaveValue(15);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mutation('UpdateRateLimitRule')).toHaveBeenCalled());
    expect(mutation('UpdateRateLimitRule').mock.calls[0][0].variables.input).toMatchObject({ algorithm: 'TOKEN_BUCKET', burst: 15 });
  });

  it('shows no burst field for a window algorithm', async () => {
    const dialog = await openEdit();
    expect(within(dialog).queryByLabelText('Burst')).not.toBeInTheDocument();
  });

  it('switches a rule off and its Slack notice on from the form', async () => {
    const dialog = await openEdit();

    fireEvent.click(within(dialog).getByRole('switch', { name: 'Enabled' }));
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Post refusals to Slack' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mutation('UpdateRateLimitRule')).toHaveBeenCalled());
    expect(mutation('UpdateRateLimitRule').mock.calls[0][0].variables.input).toMatchObject({ enabled: false, notify_slack: true });
  });

  it('dismisses the saved notice', async () => {
    const dialog = await openEdit();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
  });

  it('keeps an exempt role the server no longer lists, named by its key', async () => {
    ops.tableRows = [rateLimitRule({ exempt_roles: ['ADMIN', 'RETIRED'] })];
    const dialog = await openEdit();

    expect(within(dialog).getByText('Admin')).toBeInTheDocument();
    expect(within(dialog).getByText('RETIRED')).toBeInTheDocument();
  });
});
