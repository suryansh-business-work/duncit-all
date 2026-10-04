/**
 * The bug detail used to be a dialog over the Bugs table; it is now its own
 * route (`/telemetry/bugs/:bugId`, BugDetailPage) framing BugDetailBody. This
 * suite covers that detail and its status triage.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { BugRow } from '../../src/pages/bugs-page/queries';

const m = vi.hoisted(() => ({
  query: {
    data: undefined as { bug: unknown } | undefined,
    loading: false,
    error: undefined as Error | undefined,
    refetch: vi.fn(),
  },
  queryOptions: [] as Array<{ variables: { id: string }; skip: boolean }>,
  updateMock: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: (_doc: unknown, options: { variables: { id: string }; skip: boolean }) => {
      m.queryOptions.push(options);
      return m.query;
    },
    useMutation: () => [m.updateMock, {}],
  };
});
vi.mock('@duncit/dialogs', () => ({ notifyError: m.notifyError }));
vi.mock('../../src/pages/bugs-page/BugOccurrences', () => ({
  default: ({ bugId }: { bugId: string }) => <p>occurrences of {bugId}</p>,
}));

import BugDetailPage from '../../src/pages/bug-detail-page/index';

const makeBug = (over: Partial<BugRow> = {}): BugRow => ({
  id: 'b1',
  fingerprint: 'fp-123',
  title: 'Boom',
  error_name: 'TypeError',
  message: 'x is undefined',
  page: '/home',
  source: 'mweb',
  app: 'DuncitApp',
  portal: 'tech',
  platform: 'web',
  os: 'iOS 17',
  occurrence_count: 5,
  first_seen_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  env_counts: { localhost: 1, staging: 2, production: 3 },
  last_url: 'https://mweb.duncit.com/home',
  last_host: 'mweb.duncit.com',
  last_stack: 'TypeError: x\n  at foo',
  last_user: { id: 'u1', name: 'Priya', email: 'priya@example.com', phone: '+910000000000', roles: ['USER', 'HOST'] },
  last_environment: 'production',
  last_app_version: '1.2.3',
  last_user_agent: 'Mozilla/5.0 test-agent',
  last_duid: 'duid-1',
  last_session_id: 'sess-1',
  last_ip: '203.0.113.5',
  last_client: {
    app_version: '1.2.3',
    device_model: 'Pixel 8',
    device_os_version: 'Android 15',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    screen: null,
    viewport: null,
    network: 'wifi',
    referrer: null,
  },
  affected_user_count: 12,
  affected_user_ids: [],
  anonymous_count: 3,
  status: 'OPEN',
  resolved_at: null,
  resolved_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const renderAt = (path = '/telemetry/bugs/b1') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/telemetry/bugs" element={<p>bugs list</p>} />
        <Route path="/telemetry/bugs/:bugId" element={<BugDetailPage />} />
        <Route path="/no-id" element={<BugDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

const showBug = (bug: BugRow | null) => {
  m.query.data = { bug };
};

beforeEach(() => {
  m.query = { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  m.queryOptions = [];
  m.updateMock.mockReset();
  m.notifyError.mockReset();
});

describe('BugDetailPage', () => {
  it('loads the bug named in the URL', () => {
    showBug(makeBug());
    renderAt();
    expect(m.queryOptions[0]).toMatchObject({ variables: { id: 'b1' }, skip: false });
    expect(screen.getByRole('heading', { level: 1, name: 'Boom' })).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('renders the full detail, who it hits, the stack and the occurrences', () => {
    showBug(makeBug());
    renderAt();

    expect(screen.getByText('https://mweb.duncit.com/home')).toBeInTheDocument();
    expect(screen.getByText('mweb.duncit.com')).toBeInTheDocument();
    expect(screen.getByText('web · iOS 17')).toBeInTheDocument();
    expect(screen.getByText('DuncitApp · tech')).toBeInTheDocument();
    expect(screen.getByText('fp-123')).toBeInTheDocument();
    expect(screen.getByText('Production: 3')).toBeInTheDocument();
    expect(screen.getByText('Staging: 2')).toBeInTheDocument();
    expect(screen.getByText('Localhost: 1')).toBeInTheDocument();

    // Who it hits
    expect(screen.getByText('12 users · 3 signed out')).toBeInTheDocument();
    expect(screen.getByText('Priya')).toBeInTheDocument();
    expect(screen.getByText('USER, HOST')).toBeInTheDocument();
    expect(screen.getByText('Pixel 8 · Android 15')).toBeInTheDocument();
    expect(screen.getByText('en-IN · Asia/Kolkata')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.5')).toBeInTheDocument();

    expect(screen.getByText('Latest user agent')).toBeInTheDocument();
    expect(screen.getByText('Mozilla/5.0 test-agent')).toBeInTheDocument();
    expect(screen.getByText('Latest stack trace')).toBeInTheDocument();
    expect(screen.getByText('occurrences of b1')).toBeInTheDocument();
  });

  it('shows the dash fallback for empty fields and omits the stack and user-agent blocks', () => {
    showBug(
      makeBug({
        last_url: null,
        last_host: null,
        last_stack: null,
        last_user_agent: null,
        last_user: null,
        last_client: null,
        os: null,
        portal: null,
        affected_user_count: 0,
        anonymous_count: 0,
      }),
    );
    renderAt();

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('DuncitApp')).toBeInTheDocument();
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(screen.queryByText('Latest stack trace')).not.toBeInTheDocument();
    expect(screen.queryByText('Latest user agent')).not.toBeInTheDocument();
  });

  it('says who resolved it, or just when when nobody is recorded', () => {
    showBug(makeBug({ status: 'RESOLVED', resolved_at: '2026-01-03T00:00:00.000Z', resolved_by: 'admin-7' }));
    const { unmount } = renderAt();
    expect(screen.getByText(/· by admin-7$/)).toBeInTheDocument();
    unmount();

    showBug(makeBug({ status: 'RESOLVED', resolved_at: '2026-01-03T00:00:00.000Z', resolved_by: null }));
    renderAt();
    expect(screen.queryByText(/· by /)).not.toBeInTheDocument();
  });

  it('disables the current status and marks another, then refetches', async () => {
    const bug = makeBug();
    showBug(bug);
    m.updateMock.mockResolvedValueOnce({ data: { updateBugStatus: { id: 'b1', status: 'RESOLVED' } } });
    renderAt();

    const open = screen.getByRole('button', { name: 'Mark Open' });
    expect(open).toBeDisabled();
    expect(open).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Mark Resolved' }));
    await waitFor(() =>
      expect(m.updateMock).toHaveBeenCalledWith({ variables: { bug_id: 'b1', status: 'RESOLVED' } }),
    );
    await waitFor(() => expect(m.query.refetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Ignored' })).toBeEnabled());
    expect(m.notifyError).not.toHaveBeenCalled();
  });

  it('disables every status button while an update is in flight', async () => {
    showBug(makeBug());
    let resolve: (v: unknown) => void = () => undefined;
    m.updateMock.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Mark Ignored' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Resolved' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Mark Ignored' })).toBeDisabled();

    resolve({ data: {} });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Resolved' })).toBeEnabled());
  });

  it('reports an Error-instance failure via notifyError', async () => {
    showBug(makeBug());
    m.updateMock.mockRejectedValueOnce(new Error('kaboom'));
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Mark Resolved' }));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('kaboom'));
    expect(m.query.refetch).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Resolved' })).toBeEnabled());
  });

  it('reports a non-Error failure with the fallback message', async () => {
    showBug(makeBug());
    m.updateMock.mockRejectedValueOnce('weird');
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Mark Resolved' }));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('Failed to update bug'));
  });

  it('warns when the bug no longer exists', () => {
    showBug(null);
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'Bug' })).toBeInTheDocument();
    expect(screen.getByText(/That bug no longer exists/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Mark / })).not.toBeInTheDocument();
  });

  it('skips the query when the URL carries no id', () => {
    renderAt('/no-id');
    expect(m.queryOptions[0]).toMatchObject({ variables: { id: '' }, skip: true });
  });

  it('shows the load error', () => {
    m.query.error = new Error('network down');
    renderAt();
    expect(screen.getByText('network down')).toBeInTheDocument();
  });

  it('goes back to the bugs list', () => {
    showBug(makeBug());
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Bugs' }));
    expect(screen.getByText('bugs list')).toBeInTheDocument();
  });
});
