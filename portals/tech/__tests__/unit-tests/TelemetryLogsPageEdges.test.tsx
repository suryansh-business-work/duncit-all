import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';

const m = vi.hoisted(() => ({
  tab: 'error' as string,
  roles: undefined as string[] | undefined,
  user: null as null | { roles?: string[] },
  deleteButtonProps: null as null | { canDeleteEverything: boolean },
  tableProps: null as null | { level: string; onOpen: (row: { id: string }) => void },
  rowIdOf: null as null | ((row: { id: string }) => string),
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return { ...actual, useApolloClient: () => ({}) };
});
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('@duncit/tabs', () => ({
  useTabParam: () => ({ value: m.tab, items: [], onChange: vi.fn() }),
  DuncitTabs: () => <div data-testid="tabs" />,
}));
vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: m.user }) }));
vi.mock('../../src/components/telemetry-delete', () => ({
  TelemetryBulkBar: () => null,
  TelemetryDeleteButton: (p: { canDeleteEverything: boolean }) => {
    m.deleteButtonProps = p;
    return null;
  },
  useTelemetryTableSelection: (rowId: (row: { id: string }) => string) => (m.rowIdOf = rowId) && ({
    selectedIds: [],
    view: null,
    clear: vi.fn(),
    afterDelete: vi.fn(),
    refetch: vi.fn(),
    refetchRef: { current: null },
    selection: { onChange: vi.fn(), clearRef: { current: null } },
    onQueryChange: vi.fn(),
  }),
}));
vi.mock('../../src/pages/telemetry-logs-page/LogImportExport', () => ({ default: () => null }));
vi.mock('../../src/pages/telemetry-logs-page/LogsTable', () => ({
  default: (p: { level: string; onOpen: (row: { id: string }) => void; toolbarActions: React.ReactNode }) => {
    m.tableProps = p;
    return (
      <div>
        <span data-testid="level">{p.level}</span>
        <button type="button" onClick={() => p.onOpen({ id: 'abc' })}>
          open-row
        </button>
        {p.toolbarActions}
      </div>
    );
  },
}));

import TelemetryLogsPage from '../../src/pages/telemetry-logs-page';
import { SUPER_ROLE } from '../../src/lib/session';

function LogRoute() {
  return <p>log {useParams().id}</p>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/telemetry/logs']}>
      <Routes>
        <Route path="/telemetry/logs" element={<TelemetryLogsPage />} />
        <Route path="/telemetry/log/:id" element={<LogRoute />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  m.tab = 'error';
  m.user = null;
  m.deleteButtonProps = null;
});

describe('TelemetryLogsPage', () => {
  it('shows the blurb of the open level and opens a row at its own address', () => {
    m.tab = 'warn';
    renderPage();
    expect(screen.getByTestId('level')).toHaveTextContent('warn');
    expect(screen.getByText(/Something recovered/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'open-row' }));
    expect(screen.getByText('log abc')).toBeInTheDocument();
  });

  it('identifies selected rows by their log id', () => {
    renderPage();
    expect(m.rowIdOf?.({ id: 'row-7' })).toBe('row-7');
  });

  it('falls back to the first level when the URL names one that does not exist', () => {
    m.tab = 'bogus';
    renderPage();
    expect(screen.getByText(/Something broke/)).toBeInTheDocument();
  });

  it('allows delete-everything only for a Super Admin', () => {
    m.user = { roles: [SUPER_ROLE] };
    renderPage();
    expect(m.deleteButtonProps?.canDeleteEverything).toBe(true);
  });

  it('refuses delete-everything for other roles, and for a signed-out or role-less user', () => {
    m.user = { roles: ['ADMIN'] };
    renderPage();
    expect(m.deleteButtonProps?.canDeleteEverything).toBe(false);
    m.user = { roles: undefined };
    renderPage();
    expect(m.deleteButtonProps?.canDeleteEverything).toBe(false);
    m.user = null;
    renderPage();
    expect(m.deleteButtonProps?.canDeleteEverything).toBe(false);
  });
});
