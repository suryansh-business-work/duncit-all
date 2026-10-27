import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, act } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

const h = vi.hoisted(() => ({
  user: null as { roles?: string[] } | null,
  fetchRows: vi.fn(),
  bulk: { marker: 'bulk' },
  bulkArgs: [] as unknown[],
  tableArgs: [] as unknown[],
}));

vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: h.user }) }));
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useApolloClient: () => ({ marker: 'client' }),
}));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  useApolloTableFetch: (...args: unknown[]) => {
    h.tableArgs = args;
    return h.fetchRows;
  },
}));
vi.mock('../../src/components/telemetry-delete', () => ({
  useTelemetryTableSelection: (getId: unknown) => {
    h.bulkArgs = [getId];
    return h.bulk;
  },
}));

import ErrorLogDetailDialog from '../../src/pages/error-logs-page/ErrorLogDetailDialog';
import { useErrorLogPage } from '../../src/pages/error-logs-page/useErrorLogPage';
import {
  getErrorRowId,
  renderEnvironment,
  renderMessage,
  renderUser,
  renderWhen,
} from '../../src/pages/error-logs-page/errorLogCells';
import { ERROR_LOGS_TABLE, parseIssueData, type ErrorLogRow } from '../../src/pages/error-logs-page/queries';
import { SUPER_ROLE } from '@duncit/shell';

const makeRow = (over: Partial<ErrorLogRow> = {}): ErrorLogRow =>
  ({
    id: 'e1',
    app: 'server',
    portal: null,
    platform: 'node',
    os: 'linux',
    environment: 'production',
    source: 'server:graphql',
    level: 'error',
    page: '/graphql',
    component: 'issue',
    url: 'https://api.example.test/graphql',
    host: 'api.example.test',
    error: { name: 'GraphQLError', message: 'Cannot return null', stack: 'at resolver (x.js:1)' },
    data_json: JSON.stringify({
      kind: 'resolver',
      code: 'INTERNAL_SERVER_ERROR',
      operation: 'PodsQuery',
      gql_path: 'pods.0.title',
    }),
    user: { id: 'u1', name: 'Asha', email: 'asha@example.test', phone: '+91000', roles: ['ADMIN'] },
    client: {
      app_version: '2.0.1',
      device_model: null,
      device_os_version: null,
      locale: null,
      timezone: null,
      network: null,
    },
    duid: null,
    session_id: 'sess-1',
    ip: '198.51.100.4',
    user_agent: null,
    created_at: '2026-01-02T03:04:05.000Z',
    ...over,
  }) as ErrorLogRow;

beforeEach(() => {
  h.user = null;
  h.fetchRows.mockReset();
});

describe('parseIssueData', () => {
  it('returns the fields the error package ships in the blob', () => {
    expect(parseIssueData(makeRow())).toMatchObject({ kind: 'resolver', operation: 'PodsQuery' });
  });

  it('returns an empty object for a missing or broken blob', () => {
    expect(parseIssueData(makeRow({ data_json: null }))).toEqual({});
    expect(parseIssueData(makeRow({ data_json: '{not json' }))).toEqual({});
  });
});

describe('ErrorLogDetailDialog', () => {
  it('renders nothing without a row', () => {
    renderWithProviders(<ErrorLogDetailDialog row={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('titles the dialog with the operation and lays out every fact', () => {
    renderWithProviders(<ErrorLogDetailDialog row={makeRow()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('PodsQuery');
    expect(screen.getByText('INTERNAL_SERVER_ERROR')).toBeInTheDocument();
    expect(screen.getByText('pods.0.title')).toBeInTheDocument();
    expect(screen.getByText('node · linux')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('asha@example.test')).toBeInTheDocument();
    expect(screen.getByText('2.0.1')).toBeInTheDocument();
    expect(screen.getByText('Cannot return null')).toBeInTheDocument();
    expect(screen.getByText('at resolver (x.js:1)')).toBeInTheDocument();
  });

  it('falls back to the error name for the title when the issue names no operation', () => {
    renderWithProviders(
      <ErrorLogDetailDialog row={makeRow({ data_json: '{"kind":"network"}' })} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('GraphQLError');
  });

  it('falls back to a generic title and dashes when the row has almost nothing', () => {
    renderWithProviders(
      <ErrorLogDetailDialog
        row={makeRow({
          data_json: null,
          error: null,
          user: null,
          client: null,
          url: null,
          ip: null,
          session_id: null,
          os: null,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Server error');
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(10);
    expect(screen.queryByText('at resolver (x.js:1)')).not.toBeInTheDocument();
  });

  it('omits the stack block when the error carries none', () => {
    renderWithProviders(
      <ErrorLogDetailDialog
        row={makeRow({ error: { name: 'E', message: 'm', stack: null } })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('at resolver (x.js:1)')).not.toBeInTheDocument();
    expect(screen.getByText('m')).toBeInTheDocument();
  });

  it('closes from the footer button', () => {
    const onClose = vi.fn();
    renderWithProviders(<ErrorLogDetailDialog row={makeRow()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('errorLogCells', () => {
  it('uses the row id as the row key', () => {
    expect(getErrorRowId(makeRow({ id: 'zzz' }))).toBe('zzz');
  });

  it('renders the environment chip, defaulting colour for an unknown environment', () => {
    const { rerender } = render(<>{renderEnvironment(makeRow())}</>);
    expect((screen.getByText('production').closest('.MuiChip-root') as HTMLElement).className).toMatch(/colorError/);
    rerender(<>{renderEnvironment(makeRow({ environment: 'preview' }))}</>);
    expect((screen.getByText('preview').closest('.MuiChip-root') as HTMLElement).className).toMatch(/colorDefault/);
  });

  it('renders the message, or a dash when there is none', () => {
    const { rerender } = render(<>{renderMessage(makeRow())}</>);
    expect(screen.getByText('Cannot return null')).toHaveAttribute('title', 'Cannot return null');
    rerender(<>{renderMessage(makeRow({ error: null }))}</>);
    expect(screen.getByText('—')).toHaveAttribute('title', '');
  });

  it('renders the user and the time cells', () => {
    renderWithProviders(
      <>
        {renderUser(makeRow())}
        {renderWhen(makeRow())}
      </>,
    );
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});

describe('useErrorLogPage', () => {
  it('wires the telemetry table query and starts with nothing selected', () => {
    const { result } = renderHook(() => useErrorLogPage());
    expect(result.current.selected).toBeNull();
    expect(result.current.fetchRows).toBe(h.fetchRows);
    expect(h.tableArgs[1]).toBe(ERROR_LOGS_TABLE);
    expect(h.tableArgs[2]).toBe('telemetryLogsTable');
    expect(h.bulkArgs[0]).toBe(getErrorRowId);
    expect(result.current.bulk).toBe(h.bulk);
  });

  it('keeps the row opened in the dialog in state', () => {
    const { result } = renderHook(() => useErrorLogPage());
    const row = makeRow();
    act(() => result.current.setSelected(row));
    expect(result.current.selected).toBe(row);
  });

  it('only treats a signed-in super admin as one', () => {
    expect(renderHook(() => useErrorLogPage()).result.current.isSuperAdmin).toBe(false);
    h.user = { roles: ['ADMIN'] };
    expect(renderHook(() => useErrorLogPage()).result.current.isSuperAdmin).toBe(false);
    h.user = {};
    expect(renderHook(() => useErrorLogPage()).result.current.isSuperAdmin).toBe(false);
    h.user = { roles: [SUPER_ROLE] };
    expect(renderHook(() => useErrorLogPage()).result.current.isSuperAdmin).toBe(true);
  });
});
