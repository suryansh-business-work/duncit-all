import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import type { LogRow } from '../../src/pages/telemetry-dashboard/queries';

const m = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  return { ...actual, useApolloTableFetch: () => m.fetch };
});

import RecentLogsTable from '../../src/pages/telemetry-dashboard/RecentLogsTable';

const rows: LogRow[] = [
  {
    id: 'l1',
    source: 'mweb',
    level: 'error',
    page: '/checkout',
    component: 'CartPanel',
    environment: 'production',
    created_at: '2026-01-02T00:00:00.000Z',
    error: { name: 'TypeError', message: 'boom' },
  },
  {
    id: 'l2',
    source: 'server',
    level: 'info',
    page: '/health',
    component: 'HealthCheck',
    environment: 'staging',
    created_at: '2026-01-01T00:00:00.000Z',
    error: null,
  },
];

beforeEach(() => {
  m.fetch = vi.fn(async () => ({ rows, total: rows.length }));
});

describe('RecentLogsTable', () => {
  it('renders level chips and the message cell for rows with and without an error', async () => {
    renderWithProviders(<RecentLogsTable />);

    // renderLevel chips
    expect(await screen.findByText('error')).toBeInTheDocument();
    expect(screen.getByText('info')).toBeInTheDocument();

    // renderMessage: error present vs error null (the '—' fallback)
    expect(screen.getByText('TypeError: boom')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
