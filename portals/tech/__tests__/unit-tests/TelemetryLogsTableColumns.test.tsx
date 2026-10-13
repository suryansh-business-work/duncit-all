import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { TelemetryLogRow } from '../../src/pages/telemetry-logs-page/queries';

type Col = {
  field: string;
  hide?: boolean;
  valueGetter?: (row: TelemetryLogRow) => unknown;
  cellRenderer?: (row: TelemetryLogRow) => ReactNode;
};

const captured = vi.hoisted(() => ({ columns: [] as unknown[], props: null as null | Record<string, unknown> }));

vi.mock('@duncit/table', () => ({
  DuncitTable: (p: { columns: unknown[] } & Record<string, unknown>) => {
    captured.columns = p.columns;
    captured.props = p;
    return null;
  },
}));

import LogsTable from '../../src/pages/telemetry-logs-page/LogsTable';

const baseRow = {
  id: 'log-9',
  component: 'Header',
  environment: 'production',
  created_at: '2026-03-04T10:00:00.000Z',
  error: null,
  user: null,
  client: null,
  os: null,
  session_id: null,
  duid: null,
  ip: null,
} as unknown as TelemetryLogRow;

const mount = (level: 'error' | 'warn' = 'error') =>
  render(
    <LogsTable
      level={level as never}
      fetchRows={vi.fn()}
      refetchRef={{ current: null }}
      onOpen={vi.fn()}
      selection={{ onChange: vi.fn(), clearRef: { current: null } }}
      onQueryChange={vi.fn()}
    />,
  );
const col = (field: string) => (captured.columns as Col[]).find((c) => c.field === field) as Col;

describe('LogsTable', () => {
  it('pins the tab level server-side and scopes the table id to it', () => {
    mount('warn');
    expect(captured.props?.externalFilters).toEqual([{ field: 'level', op: 'eq', value: 'warn' }]);
    expect(captured.props?.tableId).toBe('tech-telemetry-logs-warn');
    expect(String(captured.props?.emptyText)).toContain('warn');
  });

  it('shows a dash in every optional hidden column when the log has no value', () => {
    mount();
    for (const field of ['user_email', 'app_version', 'os', 'session_id', 'duid', 'ip']) {
      expect(col(field).hide).toBe(true);
      expect(col(field).valueGetter?.(baseRow)).toBe('—');
    }
  });

  it('reads the hidden columns from the log when it carries them', () => {
    mount();
    const row = {
      ...baseRow,
      user: { id: 'u1', email: 'a@example.test' },
      client: { app_version: '2.0.1' },
      os: 'Android',
      session_id: 's-1',
      duid: 'd-1',
      ip: '10.1.1.1',
    } as unknown as TelemetryLogRow;
    expect(col('user_email').valueGetter?.(row)).toBe('a@example.test');
    expect(col('app_version').valueGetter?.(row)).toBe('2.0.1');
    expect(col('os').valueGetter?.(row)).toBe('Android');
    expect(col('session_id').valueGetter?.(row)).toBe('s-1');
    expect(col('duid').valueGetter?.(row)).toBe('d-1');
    expect(col('ip').valueGetter?.(row)).toBe('10.1.1.1');
  });

  it('links the message to the log page, preferring the error text over the component', () => {
    mount();
    const withError = { ...baseRow, error: { message: 'x is undefined' } } as unknown as TelemetryLogRow;
    const { unmount } = render(<MemoryRouter>{col('message').cellRenderer?.(withError)}</MemoryRouter>);
    const link = screen.getByRole('link', { name: 'x is undefined' });
    expect(link).toHaveAttribute('href', '/telemetry/log/log-9');
    unmount();
    render(<MemoryRouter>{col('message').cellRenderer?.(baseRow)}</MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Header' })).toHaveAttribute('href', '/telemetry/log/log-9');
  });

  it('renders the environment chip with a fallback colour for an unknown environment', () => {
    mount();
    render(
      <MemoryRouter>{col('environment').cellRenderer?.({ ...baseRow, environment: 'sandbox' } as TelemetryLogRow)}</MemoryRouter>,
    );
    expect(screen.getByText('sandbox')).toBeInTheDocument();
  });

  it('renders the when and user cells', () => {
    mount();
    render(<MemoryRouter>{col('created_at').cellRenderer?.(baseRow)}</MemoryRouter>);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    render(<MemoryRouter>{col('user').cellRenderer?.(baseRow)}</MemoryRouter>);
    expect(screen.getByTestId('PersonOffIcon')).toBeInTheDocument();
  });

  it('identifies each row by its log id', () => {
    mount();
    const getRowId = captured.props?.getRowId as (row: TelemetryLogRow) => string;
    expect(getRowId(baseRow)).toBe('log-9');
  });
});
