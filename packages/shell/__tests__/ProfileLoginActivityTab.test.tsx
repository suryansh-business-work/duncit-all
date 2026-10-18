/**
 * The Login activity tab. What matters: it waits for both reads before
 * drawing, says so when either one failed, and hands the shared table one row
 * per sign-in whose cells read the way a person would say them — "Chrome on
 * Windows · Computer", "Lucknow, UP, IN" — with "Unknown" wherever the geo-IP
 * guess or the user agent gave nothing away.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DuncitColumn, TableQueryState } from '@duncit/table';
import type { ConnectedAccounts, LoginActivityEntry } from '../src/chrome/ProfilePage/queries';

interface CapturedTable {
  ariaLabel: string;
  columns: DuncitColumn<LoginActivityEntry>[];
  fetchRows: (q: TableQueryState) => Promise<{ rows: LoginActivityEntry[]; total: number }>;
  getRowId: (row: LoginActivityEntry) => string;
  emptyText: string;
  defaultSort: { field: string; dir: string };
}

const { apollo, seen } = vi.hoisted(() => ({
  apollo: { useQuery: vi.fn() },
  seen: { table: null as unknown },
}));

vi.mock('@apollo/client/react', () => apollo);
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (iso: string) => `at ${iso}` }),
}));
vi.mock('@duncit/table', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/table')>()),
  DuncitTable: (props: unknown) => {
    seen.table = props;
    return <div data-testid="duncit-table" />;
  },
}));

const { LoginActivityTab } = await import('../src/chrome/ProfilePage/activity/LoginActivityTab');
const { MY_CONNECTED_ACCOUNTS, MY_LOGIN_ACTIVITY } = await import('../src/chrome/ProfilePage/queries');

const ACCOUNTS: ConnectedAccounts = {
  has_password: true,
  password_changed_at: null,
  last_login_at: '2026-10-18T08:30:00Z',
  last_login_provider: 'EMAIL',
  google: null,
  two_factor_enabled: false,
  two_factor_enabled_at: null,
  two_factor_recovery_codes_left: 0,
};

const entry = (over: Partial<LoginActivityEntry> = {}): LoginActivityEntry => ({
  id: 'login-1',
  signed_in_at: '2026-10-18T08:30:00Z',
  provider: 'EMAIL',
  ip: '203.0.113.7',
  city: 'Lucknow',
  region: 'UP',
  country: 'IN',
  browser: 'Chrome',
  os: 'Windows',
  device_type: 'DESKTOP',
  surface: 'PORTAL',
  origin_host: 'admin.duncit.com',
  ...over,
});

const QUERY: TableQueryState = { search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'desc', filters: [] };

interface ReadState {
  data: unknown;
  loading: boolean;
}
const reads = new Map<unknown, ReadState>();
const table = () => seen.table as CapturedTable;
const cell = (field: string, row: LoginActivityEntry) =>
  table()
    .columns.find((column) => column.field === field)
    ?.valueGetter?.(row);

beforeEach(() => {
  seen.table = null;
  reads.clear();
  reads.set(MY_CONNECTED_ACCOUNTS, { data: { myConnectedAccounts: ACCOUNTS }, loading: false });
  reads.set(MY_LOGIN_ACTIVITY, {
    data: { myLoginActivity: { retention_days: 90, entries: [entry()] } },
    loading: false,
  });
  apollo.useQuery.mockReset().mockImplementation((doc: unknown) => reads.get(doc));
});

describe('LoginActivityTab', () => {
  it('holds a placeholder while either read is still on its way', () => {
    reads.set(MY_LOGIN_ACTIVITY, { data: undefined, loading: true });
    render(<LoginActivityTab />);

    expect(screen.queryByTestId('profile-login-history')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-activity-error')).not.toBeInTheDocument();
  });

  it('says the activity could not load when a read finished with nothing', () => {
    reads.set(MY_CONNECTED_ACCOUNTS, { data: undefined, loading: false });
    render(<LoginActivityTab />);

    expect(screen.getByTestId('profile-activity-error')).toHaveTextContent('Could not load your login activity.');
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
  });

  it('shows the last sign-in and the history with its retention window', () => {
    render(<LoginActivityTab />);

    expect(screen.getByTestId('profile-sign-in-activity')).toBeInTheDocument();
    const history = screen.getByTestId('profile-login-history');
    expect(history).toHaveTextContent('Recent sign-ins');
    expect(history).toHaveTextContent('in the last 90 days');
    expect(table().ariaLabel).toBe('Recent sign-ins');
    expect(table().emptyText).toBe('No sign-ins recorded yet.');
    expect(table().defaultSort).toEqual({ field: 'signed_in_at', dir: 'desc' });
    expect(table().getRowId(entry({ id: 'login-9' }))).toBe('login-9');
  });
});

describe('LoginHistorySection rows', () => {
  it('finds a sign-in by where, on what and through which host it came', async () => {
    const office = entry();
    const phone = entry({
      id: 'login-2',
      city: 'Pune',
      region: null,
      country: 'IN',
      browser: 'Safari',
      os: 'iOS',
      device_type: 'MOBILE',
      surface: 'NATIVE',
      origin_host: null,
    });
    reads.set(MY_LOGIN_ACTIVITY, {
      data: { myLoginActivity: { retention_days: 30, entries: [office, phone] } },
      loading: false,
    });
    render(<LoginActivityTab />);

    await expect(table().fetchRows({ ...QUERY, search: 'pune' })).resolves.toEqual({ rows: [phone], total: 1 });
    await expect(table().fetchRows({ ...QUERY, search: 'duncit app' })).resolves.toEqual({ rows: [phone], total: 1 });
    await expect(table().fetchRows({ ...QUERY, search: '203.0.113' })).resolves.toEqual({
      rows: [office, phone],
      total: 2,
    });
    await expect(table().fetchRows({ ...QUERY, search: 'admin.duncit' })).resolves.toEqual({
      rows: [office],
      total: 1,
    });
  });

  it('reads every column the way a person would say it', () => {
    render(<LoginActivityTab />);
    const row = entry();

    expect(table().columns.map((column) => column.headerName)).toEqual([
      'When',
      'Method',
      'Location',
      'Device',
      'Signed in on',
      'IP address',
    ]);
    expect(cell('signed_in_at', row)).toBe('at 2026-10-18T08:30:00Z');
    expect(cell('provider', row)).toBe('Password');
    expect(cell('city', row)).toBe('Lucknow, UP, IN');
    expect(cell('browser', row)).toBe('Chrome on Windows · Computer');
    expect(cell('origin_host', row)).toBe('admin.duncit.com');
    expect(cell('ip', row)).toBe('203.0.113.7');
  });

  it('names each sign-in method, and an unrecognised one as Unknown', () => {
    render(<LoginActivityTab />);

    expect(cell('provider', entry({ provider: 'OTP' }))).toBe('One-time code');
    expect(cell('provider', entry({ provider: 'GOOGLE' }))).toBe('Google');
    expect(cell('provider', entry({ provider: 'APPLE' }))).toBe('Apple');
    expect(cell('provider', entry({ provider: 'FACEBOOK' }))).toBe('Unknown');
    expect(cell('provider', entry({ provider: null }))).toBe('Unknown');
    expect(cell('ip', entry({ ip: null }))).toBe('Unknown');
  });
});
