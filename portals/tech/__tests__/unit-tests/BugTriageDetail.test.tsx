import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { formatDateTime } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import BugOccurrences from '../../src/pages/bugs-page/BugOccurrences';
import BugDetailBody from '../../src/pages/bugs-page/BugDetailBody';
import BugDetailPage from '../../src/pages/bug-detail-page';
import { affectedSummary, type BugRow } from '../../src/pages/bugs-page/queries';

const makeBug = (over: Partial<BugRow> = {}): BugRow => ({
  id: 'b1',
  fingerprint: 'fp-abc',
  title: 'Cannot read length of undefined',
  error_name: 'TypeError',
  message: 'x is undefined',
  page: '/home',
  source: 'mweb:home',
  app: 'mweb',
  portal: 'tech',
  platform: 'web',
  os: 'Android',
  occurrence_count: 5,
  first_seen_at: '2026-01-01T00:00:00.000Z',
  last_seen_at: '2026-01-02T00:00:00.000Z',
  env_counts: { localhost: 1, staging: 2, production: 3 },
  last_url: 'https://mweb.example.test/home',
  last_host: 'mweb.example.test',
  last_stack: 'TypeError: x\n  at foo',
  last_user: { id: 'u1', name: 'Asha', email: 'asha@example.test', phone: '+91000', roles: ['ADMIN', 'TECH'] },
  last_environment: 'production',
  last_app_version: '1.2.3',
  last_user_agent: 'UA/1.0',
  last_duid: 'duid-1',
  last_session_id: 'sess-1',
  last_ip: '203.0.113.9',
  last_client: {
    app_version: '1.2.3',
    device_model: 'Pixel 8',
    device_os_version: 'Android 15',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    screen: null,
    viewport: null,
    network: '4g',
    referrer: null,
  },
  affected_user_count: 3,
  affected_user_ids: ['u1'],
  anonymous_count: 2,
  status: 'OPEN',
  resolved_at: null,
  resolved_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const occurrence = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  environment: 'production',
  platform: 'web',
  os: 'Android',
  component: 'HomeFeed',
  url: 'https://mweb.example.test/home',
  host: 'mweb.example.test',
  error: { name: 'TypeError', message: 'x is undefined', stack: 'at foo (a.js:1)' },
  data_json: '{"k":"v"}',
  user: { id: 'u1', name: 'Asha', email: 'asha@example.test', phone: '+91000', roles: [] },
  client: {
    app_version: '1.2.3',
    device_model: 'Pixel 8',
    device_os_version: 'Android 15',
    locale: null,
    timezone: null,
    network: '4g',
  },
  duid: null,
  session_id: null,
  ip: '203.0.113.9',
  user_agent: null,
  created_at: '2026-01-02T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  resetOps();
  ops.q = { BugOccurrences: { data: { bugOccurrences: [] } } };
});

describe('affectedSummary', () => {
  it('pluralises users and appends signed-out visitors', () => {
    expect(affectedSummary({ affected_user_count: 1, anonymous_count: 0 })).toBe('1 user');
    expect(affectedSummary({ affected_user_count: 12, anonymous_count: 3 })).toBe('12 users · 3 signed out');
    expect(affectedSummary({ affected_user_count: 0, anonymous_count: 4 })).toBe('4 signed out');
    expect(affectedSummary({ affected_user_count: 0, anonymous_count: 0 })).toBe('—');
  });
});

describe('BugOccurrences', () => {
  it('shows a spinner while the first read is in flight', () => {
    ops.q.BugOccurrences = { loading: true };
    renderWithProviders(<BugOccurrences bugId="b1" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(/No persisted occurrences/)).not.toBeInTheDocument();
  });

  it('shows the query error', () => {
    ops.q.BugOccurrences = { error: new Error('occurrences failed') };
    renderWithProviders(<BugOccurrences bugId="b1" />);
    expect(screen.getByText('occurrences failed')).toBeInTheDocument();
    expect(screen.queryByText(/No persisted occurrences/)).not.toBeInTheDocument();
  });

  it('explains an empty list as the retention window', () => {
    renderWithProviders(<BugOccurrences bugId="b1" />);
    expect(screen.getByText(/No persisted occurrences inside the retention window/)).toBeInTheDocument();
    expect(screen.getByText('Recent occurrences')).toBeInTheDocument();
  });

  it('lists each occurrence with its count, environment and component', () => {
    ops.q.BugOccurrences = {
      data: { bugOccurrences: [occurrence(), occurrence({ id: 'o2', environment: 'preview', component: 'Cart' })] },
    };
    renderWithProviders(<BugOccurrences bugId="b1" />);
    expect(screen.getByText('Recent occurrences (2)')).toBeInTheDocument();
    expect(screen.getByText('HomeFeed')).toBeInTheDocument();
    expect(screen.getByText('Cart')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('preview')).toBeInTheDocument();
  });

  it('describes who hit it on one line and shows the url, stack and data', () => {
    ops.q.BugOccurrences = { data: { bugOccurrences: [occurrence()] } };
    renderWithProviders(<BugOccurrences bugId="b1" />);
    expect(
      screen.getByText('Asha · asha@example.test · +91000 · v1.2.3 · Pixel 8 Android 15 · 4g · 203.0.113.9'),
    ).toBeInTheDocument();
    expect(screen.getByText('TypeError:')).toBeInTheDocument();
    expect(screen.getByText(/mweb\.example\.test\/home · mweb\.example\.test/)).toBeInTheDocument();
    expect(screen.getByText('at foo (a.js:1)')).toBeInTheDocument();
    expect(screen.getByText('{"k":"v"}')).toBeInTheDocument();
  });

  it('copes with a signed-out occurrence that has no client, error, url or data', () => {
    ops.q.BugOccurrences = {
      data: {
        bugOccurrences: [
          occurrence({
            user: null,
            client: null,
            error: null,
            url: null,
            host: null,
            data_json: null,
            ip: null,
            os: null,
          }),
        ],
      },
    };
    renderWithProviders(<BugOccurrences bugId="b1" />);
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(screen.queryByText('TypeError:')).not.toBeInTheDocument();
    expect(screen.queryByText('at foo (a.js:1)')).not.toBeInTheDocument();
  });

  it('does not repeat an email that equals the name and omits the host when absent', () => {
    ops.q.BugOccurrences = {
      data: {
        bugOccurrences: [
          occurrence({
            user: { id: 'u2', name: 'a@x.test', email: 'a@x.test', phone: null, roles: [] },
            client: { app_version: null, device_model: null, device_os_version: null, network: null },
            ip: null,
            host: null,
            error: { name: 'E', message: 'm', stack: null },
          }),
        ],
      },
    };
    renderWithProviders(<BugOccurrences bugId="b1" />);
    expect(screen.getByText('a@x.test')).toBeInTheDocument();
    const url = screen.getByText('https://mweb.example.test/home');
    expect(url.textContent).toBe('https://mweb.example.test/home');
  });
});

describe('BugDetailBody', () => {
  it('lays out the bug, who it reaches and the environment counts', () => {
    renderWithProviders(<BugDetailBody bug={makeBug({ resolved_at: '2026-02-02T00:00:00.000Z', resolved_by: 'u9' })} />);
    expect(screen.getByText('TypeError')).toBeInTheDocument();
    expect(screen.getByText('mweb · tech')).toBeInTheDocument();
    expect(screen.getByText('web · Android')).toBeInTheDocument();
    expect(screen.getByText('3 users · 2 signed out')).toBeInTheDocument();
    expect(screen.getByText('ADMIN, TECH')).toBeInTheDocument();
    expect(screen.getByText('Pixel 8 · Android 15')).toBeInTheDocument();
    expect(screen.getByText('en-IN · Asia/Kolkata')).toBeInTheDocument();
    expect(screen.getByText(/by u9/)).toBeInTheDocument();
    expect(screen.getByText('fp-abc')).toBeInTheDocument();
  });

  it('shows the resolution time without a person when none is recorded', () => {
    renderWithProviders(<BugDetailBody bug={makeBug({ resolved_at: '2026-02-02T00:00:00.000Z', resolved_by: null })} />);
    expect(screen.queryByText(/by u9/)).not.toBeInTheDocument();
    expect(screen.getByText(formatDateTime('2026-02-02T00:00:00.000Z'))).toBeInTheDocument();
  });

  it('dashes every optional field for a bug nobody was signed in for', () => {
    renderWithProviders(
      <BugDetailBody
        bug={makeBug({
          last_user: null,
          last_client: null,
          portal: null,
          os: null,
          last_url: null,
          last_host: null,
          last_ip: null,
          last_app_version: null,
          last_environment: null,
          last_duid: null,
          last_session_id: null,
          affected_user_count: 0,
          anonymous_count: 0,
        })}
      />,
    );
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(12);
  });

  it('omits the user agent and stack blocks when the bug has none', () => {
    renderWithProviders(<BugDetailBody bug={makeBug({ last_user_agent: null, last_stack: null })} />);
    expect(screen.queryByText('UA/1.0')).not.toBeInTheDocument();
    expect(screen.queryByText(/at foo/)).not.toBeInTheDocument();
  });

  it('shows the user agent and stack blocks when the bug has them', () => {
    renderWithProviders(<BugDetailBody bug={makeBug()} />);
    expect(screen.getByText('UA/1.0')).toBeInTheDocument();
    expect(screen.getByText(/at foo/)).toBeInTheDocument();
  });

  it('tolerates a last user whose roles came back missing', () => {
    const user = { id: 'u3', name: 'Ravi', email: null, phone: null } as unknown as BugRow['last_user'];
    renderWithProviders(<BugDetailBody bug={makeBug({ last_user: user })} />);
    expect(screen.getByText('Ravi')).toBeInTheDocument();
  });
});

const renderPage = (path = '/telemetry/bugs/b1') =>
  renderWithProviders(<></>, {
    initialEntries: [path],
    routes: (
      <>
        <Route path="/telemetry/bugs/:bugId" element={<BugDetailPage />} />
        <Route path="/telemetry/bugs" element={<div>bugs list</div>} />
        <Route path="/missing" element={<BugDetailPage />} />
      </>
    ),
  });

describe('BugDetailPage', () => {
  it('shows the bug with its status and the other statuses as actions', () => {
    ops.q.Bug = { data: { bug: makeBug() } };
    renderPage();
    expect(screen.getByRole('heading', { name: 'Cannot read length of undefined' })).toBeInTheDocument();
    const mark = screen.getAllByTestId('bug-detail-mark-status');
    expect(mark.map((b) => b.textContent)).toEqual(['Mark Open', 'Mark Resolved', 'Mark Ignored']);
    expect(mark[0]).toBeDisabled();
    expect(mark[1]).toBeEnabled();
  });

  it('marks the bug resolved and re-reads it', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.Bug = { data: { bug: makeBug() }, refetch };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Resolved' }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(mutation('UpdateBugStatus')).toHaveBeenCalledWith({
      variables: { bug_id: 'b1', status: 'RESOLVED' },
    });
  });

  it('reports a failed status change with the server message', async () => {
    ops.q.Bug = { data: { bug: makeBug() } };
    mutation('UpdateBugStatus').mockRejectedValue(new Error('status refused'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Ignored' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('status refused'));
  });

  it('falls back to a generic message for a non-Error rejection', async () => {
    ops.q.Bug = { data: { bug: makeBug() } };
    mutation('UpdateBugStatus').mockRejectedValue('nope');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Ignored' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith(expect.stringMatching(/.+/)));
    expect(ops.notifyError).not.toHaveBeenCalledWith('nope');
  });

  it('keeps the bug on screen while a refresh is loading', () => {
    ops.q.Bug = { data: { bug: makeBug() }, loading: true };
    renderPage();
    expect(screen.getByRole('heading', { name: 'Cannot read length of undefined' })).toBeInTheDocument();
  });

  it('says the bug no longer exists when the id resolves to nothing', () => {
    ops.q.Bug = { data: { bug: null } };
    renderPage();
    expect(screen.getByText(/That bug no longer exists/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bug' })).toBeInTheDocument();
  });

  it('shows the load error', () => {
    ops.q.Bug = { error: new Error('bug read failed') };
    renderPage();
    expect(screen.getByText('bug read failed')).toBeInTheDocument();
  });

  it('goes back to the list', () => {
    ops.q.Bug = { data: { bug: makeBug() } };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Bugs' }));
    expect(screen.getByText('bugs list')).toBeInTheDocument();
  });

  it('does not query when the route carries no id', () => {
    ops.q.Bug = { data: undefined };
    renderPage('/missing');
    expect(within(document.body).getByText(/That bug no longer exists/)).toBeInTheDocument();
  });
});
