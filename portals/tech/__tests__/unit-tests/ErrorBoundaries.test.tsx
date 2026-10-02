import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ErrorBoundariesTable from '../../src/pages/error-boundaries-page/ErrorBoundariesTable';
import ErrorBoundaryDetailDialog from '../../src/pages/error-boundaries-page/ErrorBoundaryDetailDialog';
import { BOUNDARY_FILTER, parseBoundaryData, surfaceOf } from '../../src/pages/error-boundaries-page/boundary-data';
import type { ErrorLogRow } from '../../src/pages/error-logs-page/queries';

const makeRow = (over: Partial<ErrorLogRow> = {}): ErrorLogRow => ({
  id: 'log-1',
  app: 'mWeb',
  portal: null,
  platform: 'web',
  os: 'Android 15',
  environment: 'production',
  source: 'mweb',
  level: 'error',
  page: '/pods/DUN-POD-4821',
  component: 'errorBoundary',
  url: 'https://duncit.com/pods/DUN-POD-4821',
  host: 'duncit.com',
  error: { name: 'TypeError', message: 'Cannot read pod venue', stack: 'TypeError: Cannot read pod venue\n  at PodPage' },
  data_json: JSON.stringify({
    event: 'CAUGHT',
    crash_id: 'mg9k2-4f1a',
    scope: 'page',
    surface: 'mWeb',
    component_stack: 'at PodPage\n  at App',
  }),
  user: { id: 'u1', name: 'Ravi Kumar', email: 'ravi.plays@duncit.com', phone: null, roles: ['USER'] },
  client: {
    app_version: '1.81.10',
    device_model: null,
    device_os_version: null,
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    network: null,
  },
  duid: null,
  session_id: 'sess-7',
  ip: null,
  user_agent: null,
  created_at: '2026-10-03T09:30:00.000Z',
  ...over,
});

describe('boundary data', () => {
  it('pins the page to the boundary marker the shared package logs with', () => {
    expect(BOUNDARY_FILTER).toEqual([{ field: 'component', op: 'eq', value: 'errorBoundary' }]);
  });

  it('reads the crash fields out of the data blob, and nothing from a missing or broken one', () => {
    expect(parseBoundaryData(makeRow())).toMatchObject({ event: 'CAUGHT', crash_id: 'mg9k2-4f1a', scope: 'page' });
    expect(parseBoundaryData(makeRow({ data_json: null }))).toEqual({});
    expect(parseBoundaryData(makeRow({ data_json: '{not json' }))).toEqual({});
  });

  it('names the portal as the surface for a console crash, otherwise the app', () => {
    expect(surfaceOf(makeRow({ portal: 'finance', app: 'portal' }))).toBe('finance');
    expect(surfaceOf(makeRow())).toBe('mWeb');
  });
});

describe('ErrorBoundariesTable', () => {
  it('tells a caught crash from a reported one, labels the boundary, and opens a row', async () => {
    const caught = makeRow();
    const reported = makeRow({
      id: 'log-2',
      page: '/finance/settlements',
      portal: 'finance',
      data_json: JSON.stringify({ event: 'REPORTED', crash_id: 'mg9k3-0b2c', scope: 'root', surface: 'finance' }),
    });
    const onOpen = vi.fn();
    render(
      <ErrorBoundariesTable
        fetchRows={vi.fn(async () => ({ rows: [caught, reported], total: 2 }))}
        refetchRef={{ current: null }}
        onOpen={onOpen}
        selection={{ onChange: vi.fn(), clearRef: { current: null } }}
        onQueryChange={vi.fn()}
      />,
    );

    expect(await screen.findByText('/finance/settlements')).toBeInTheDocument();
    expect(screen.getAllByText('Crash').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Whole app').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Page / screen').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('/finance/settlements'));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'log-2' })));
  });
});

describe('ErrorBoundaryDetailDialog', () => {
  it('renders nothing while no row is open', () => {
    const { container } = render(<ErrorBoundaryDetailDialog row={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows where and on what the crash happened, with both stacks', () => {
    const onClose = vi.fn();
    render(<ErrorBoundaryDetailDialog row={makeRow()} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('TypeError')).toBeInTheDocument();
    expect(within(dialog).getByText('mg9k2-4f1a')).toBeInTheDocument();
    expect(within(dialog).getByText('Page / screen')).toBeInTheDocument();
    expect(within(dialog).getByText('web · Android 15')).toBeInTheDocument();
    expect(within(dialog).getByText('Ravi Kumar')).toBeInTheDocument();
    expect(within(dialog).getByText(/at PodPage\s+at App/)).toBeInTheDocument();
    expect(within(dialog).getByText(/TypeError: Cannot read pod venue/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to the route as the title and leaves out stacks it never received', () => {
    render(
      <ErrorBoundaryDetailDialog
        row={makeRow({
          error: null,
          os: null,
          user: null,
          data_json: JSON.stringify({ event: 'REPORTED', scope: 'root' }),
        })}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('/pods/DUN-POD-4821').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Reported')).toBeInTheDocument();
    expect(within(dialog).getByText('Whole app')).toBeInTheDocument();
    expect(within(dialog).getByText('Signed out')).toBeInTheDocument();
    expect(within(dialog).queryByText('Component stack')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Stack trace')).not.toBeInTheDocument();
  });
});
