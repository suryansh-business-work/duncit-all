import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, error: undefined as Error | undefined },
  queryOpts: [] as Array<{ variables?: { id?: string }; skip?: boolean }>,
  rotate: vi.fn(),
  rotating: false,
  confirm: vi.fn(),
  notify: vi.fn(),
  copy: vi.fn(),
  roles: ['TECH_MANAGER'] as string[] | undefined,
  apiKey: 'pk_live_123' as string | undefined,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: (doc: { definitions: Array<{ name?: { value: string } }> }, opts: (typeof m.queryOpts)[number]) => {
      if (doc.definitions[0]?.name?.value === 'TelemetryLogById') {
        m.queryOpts.push(opts);
        return m.query;
      }
      return {
        data: m.apiKey === undefined ? undefined : { telemetrySettings: { public_api_key: m.apiKey } },
        loading: false,
      };
    },
    useMutation: () => [m.rotate, { loading: m.rotating }],
  };
});
vi.mock('@duncit/dialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/dialogs')>();
  return { ...actual, notify: m.notify, useConfirm: () => m.confirm };
});
vi.mock('@duncit/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/utils')>();
  return {
    ...actual,
    copyToClipboard: m.copy,
    parseApiError: (e: unknown) => (e instanceof Error ? e.message : 'unknown'),
  };
});
vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: m.roles === undefined ? null : { roles: m.roles } }),
}));
vi.mock('../../src/pages/telemetry-logs-page/LogDetailBody', () => ({
  default: (p: { row: { id: string } }) => <div data-testid="log-body">{p.row.id}</div>,
}));

import TelemetryLogDetailPage from '../../src/pages/telemetry-log-detail-page';
import PublicApiKeyCard from '../../src/pages/telemetry-logs-settings/PublicApiKeyCard';
import { SUPER_ROLE } from '../../src/lib/session';

const logRow = (over: Record<string, unknown> = {}) => ({
  id: 'l1',
  level: 'error',
  environment: 'production',
  page: '/checkout',
  component: 'PayButton',
  ...over,
});

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{`${loc.pathname}${loc.search}`}</p>;
}

const renderDetail = (path = '/telemetry/log/l1') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/telemetry/log/:logId" element={<TelemetryLogDetailPage />} />
        <Route path="/telemetry/log" element={<TelemetryLogDetailPage />} />
        <Route path="/telemetry/logs" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  m.query = { data: undefined, loading: false, error: undefined };
  m.queryOpts = [];
  m.rotating = false;
  m.roles = ['TECH_MANAGER'];
  m.apiKey = 'pk_live_123';
  m.copy.mockResolvedValue(true);
  m.rotate.mockResolvedValue({});
});

describe('TelemetryLogDetailPage', () => {
  it('shows the log with its level, environment and page / component heading', () => {
    m.query.data = { telemetryLog: logRow() };
    renderDetail();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('/checkout / PayButton');
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByTestId('log-body')).toHaveTextContent('l1');
    expect(m.queryOpts.at(-1)).toMatchObject({ variables: { id: 'l1' }, skip: false });
  });

  it('goes back to the tab the log was read in', async () => {
    m.query.data = { telemetryLog: logRow({ level: 'warn' }) };
    renderDetail();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(await screen.findByTestId('where')).toHaveTextContent('/telemetry/logs?selectedtab=warn');
  });

  it('warns when the log has aged out and goes back to the default tab', async () => {
    m.query.data = { telemetryLog: null };
    renderDetail();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('log-body')).toBeNull();
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/telemetry\/logs$/);
  });

  it('colours an unknown environment with the default chip', () => {
    m.query.data = { telemetryLog: logRow({ environment: 'sandbox' }) };
    renderDetail();
    expect(screen.getByText('sandbox')).toBeInTheDocument();
  });

  it('shows the read error instead of the log', () => {
    m.query = { data: undefined, loading: false, error: new Error('log read failed') };
    renderDetail();
    expect(screen.getByText('log read failed')).toBeInTheDocument();
    expect(screen.queryByTestId('log-body')).toBeNull();
  });

  it('shows a spinner, and neither the log nor the not-found warning, while loading', () => {
    m.query = { data: undefined, loading: true, error: undefined };
    const { container } = renderDetail();
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('log-body')).toBeNull();
  });

  it('does not query when the address carries no log id', () => {
    renderDetail('/telemetry/log');
    expect(m.queryOpts.at(-1)).toMatchObject({ skip: true });
  });
});

describe('PublicApiKeyCard', () => {
  const copyButton = () => screen.getByTestId('ContentCopyIcon').closest('button') as HTMLButtonElement;

  it('shows the sample feed URL with the key and copies it', async () => {
    render(<PublicApiKeyCard />);
    expect(screen.getByText(/\/telemetry\/logs\.json\?key=pk_live_123&level=error/)).toBeInTheDocument();
    fireEvent.click(copyButton());
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Feed URL copied', 'success'));
    expect(m.copy.mock.calls[0][0]).toContain('key=pk_live_123');
  });

  it('reports when the clipboard is unavailable', async () => {
    m.copy.mockResolvedValue(false);
    render(<PublicApiKeyCard />);
    fireEvent.click(copyButton());
    await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Could not copy the URL', 'error'));
  });

  it('shows a loading placeholder and disables copy until the key arrives', () => {
    m.apiKey = undefined;
    render(<PublicApiKeyCard />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(copyButton()).toBeDisabled();
  });

  it('hides rotation from anyone who is not a Super Admin', () => {
    render(<PublicApiKeyCard />);
    expect(screen.queryByTestId('AutorenewIcon')).toBeNull();
  });

  it('hides rotation for a signed-out session', () => {
    m.roles = undefined;
    render(<PublicApiKeyCard />);
    expect(screen.queryByTestId('AutorenewIcon')).toBeNull();
  });

  describe('as a Super Admin', () => {
    const rotateButton = () => screen.getByTestId('AutorenewIcon').closest('button') as HTMLButtonElement;
    beforeEach(() => {
      m.roles = [SUPER_ROLE];
    });

    it('rotates only after the destructive confirmation is accepted', async () => {
      m.confirm.mockResolvedValue(true);
      render(<PublicApiKeyCard />);
      fireEvent.click(rotateButton());
      await waitFor(() => expect(m.rotate).toHaveBeenCalledTimes(1));
      expect(m.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
      expect(m.notify).toHaveBeenCalledWith(expect.stringContaining('New key in place'), 'success');
    });

    it('leaves the key alone when the confirmation is declined', async () => {
      m.confirm.mockResolvedValue(false);
      render(<PublicApiKeyCard />);
      fireEvent.click(rotateButton());
      await waitFor(() => expect(m.confirm).toHaveBeenCalled());
      expect(m.rotate).not.toHaveBeenCalled();
    });

    it('reports a rotation the server refused', async () => {
      m.confirm.mockResolvedValue(true);
      m.rotate.mockRejectedValue(new Error('Access denied'));
      render(<PublicApiKeyCard />);
      fireEvent.click(rotateButton());
      await waitFor(() => expect(m.notify).toHaveBeenCalledWith('Access denied', 'error'));
    });

    it('locks the button while a rotation is in flight', () => {
      m.rotating = true;
      render(<PublicApiKeyCard />);
      expect(rotateButton()).toBeDisabled();
      expect(rotateButton()).toHaveTextContent('Rotating…');
    });
  });
});
