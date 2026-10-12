import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testkit';
import { columnValue, searchRows } from '../mocks/table-stub';

const m = vi.hoisted(() => ({
  configured: true as boolean | undefined,
  report: undefined as unknown,
  reportError: undefined as unknown,
  vars: [] as Array<Record<string, string>>,
  skipped: [] as boolean[],
  refetch: vi.fn(),
}));
const opName = (doc: { definitions: Array<{ name?: { value: string } }> }) =>
  doc.definitions[0].name?.value ?? '';
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (
    doc: Parameters<typeof opName>[0],
    options?: { variables?: Record<string, string>; skip?: boolean }
  ) => {
    if (opName(doc) === 'Msg91Configured') {
      return { data: m.configured === undefined ? undefined : { msg91Configured: m.configured } };
    }
    if (options?.variables?.start_date) m.vars.push(options.variables);
    m.skipped.push(Boolean(options?.skip));
    return {
      data: m.report,
      loading: false,
      error: m.reportError,
      refetch: m.refetch,
    };
  },
}));
vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  DuncitTable: (await import('../mocks/table-stub')).StubTable,
}));
vi.mock('react-chartjs-2', () => ({
  Bar: (p: { data: { labels: string[]; datasets: Array<{ label: string; data: number[] }> } }) => (
    <div role="img" aria-label="chart">
      {p.data.datasets.map((d) => `${d.label}:${d.data.join(',')}`).join(';')}
    </div>
  ),
}));

import Msg91LogsPage from '../../src/pages/msg91-otp/logs';
import Msg91AnalyticsPage from '../../src/pages/msg91-otp/analytics';
import { useMsg91Report } from '../../src/pages/msg91-otp/useMsg91Report';
import { MSG91_WIDGET_LOGS } from '../../src/pages/msg91-otp/queries';
import {
  makeDateWindowSchema,
  windowEndingToday,
} from '../../src/pages/msg91-otp/date-window';

const logRow = (over: Record<string, unknown> = {}) => ({
  request_id: 'req-1',
  identifier: '919000000000',
  requested_at: '2026-08-06T10:00:00.000Z',
  verified: true,
  token_verified: false,
  verify_attempts: 2,
  retries: 1,
  user_ip: '10.0.0.1',
  sms: 2,
  whatsapp: 1,
  email: 0,
  voice: 0,
  ...over,
});

const day = (date: string, total: number, verified: number) => ({
  date,
  total,
  verified,
  token_verified: 1,
  retries: 3,
  sms: total,
  whatsapp: 0,
  email: 0,
  voice: 0,
});

beforeEach(() => {
  m.configured = true;
  m.report = undefined;
  m.reportError = undefined;
  m.vars = [];
  m.skipped = [];
  m.refetch.mockReset().mockResolvedValue({});
});

describe('MSG91 page frame', () => {
  it('shows a progress bar until the server says whether MSG91 is configured', () => {
    m.configured = undefined;
    renderWithProviders(<Msg91LogsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('msg91-date-window')).not.toBeInTheDocument();
  });

  it('sends the operator to the keys when MSG91 is not configured, and asks nothing', () => {
    m.configured = false;
    renderWithProviders(<Msg91LogsPage />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/msg91-otp/settings');
    expect(m.skipped.every(Boolean)).toBe(true);
  });

  it('shows the report error under the date window', () => {
    m.reportError = new Error('MSG91 said no');
    renderWithProviders(<Msg91LogsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('MSG91 said no');
  });
});

describe('Msg91LogsPage', () => {
  it('lists each widget request with yes/no chips and the channels it used', async () => {
    m.report = {
      msg91WidgetLogs: {
        total: 2,
        rows: [logRow(), logRow({ request_id: 'req-2', verified: false, sms: 0, whatsapp: 0 })],
      },
    };
    renderWithProviders(<Msg91LogsPage />);
    const first = await screen.findByTestId('row-req-1');
    expect(within(first).getByText('Yes')).toBeInTheDocument();
    expect(within(first).getByText('No')).toBeInTheDocument();
    expect(within(first).getByText(/SMS ×2 · WhatsApp ×1/)).toBeInTheDocument();
    const second = screen.getByTestId('row-req-2');
    expect(within(second).getByText('—', { selector: '[data-field="channels"]' })).toBeInTheDocument();
  });

  it('says when MSG91 returned only part of the window', async () => {
    m.report = { msg91WidgetLogs: { total: 120, rows: [logRow()] } };
    renderWithProviders(<Msg91LogsPage />);
    expect(await screen.findByText(/1.*120/)).toBeInTheDocument();
  });

  it('says nothing about paging when the whole window came back', async () => {
    m.report = { msg91WidgetLogs: { total: 1, rows: [logRow()] } };
    renderWithProviders(<Msg91LogsPage />);
    await screen.findByTestId('row-req-1');
    expect(screen.queryByText(/of 1\b/)).not.toBeInTheDocument();
  });

  it('searches by number, request id and IP, and sorts by plain values', async () => {
    m.report = {
      msg91WidgetLogs: {
        total: 2,
        rows: [logRow(), logRow({ request_id: 'req-2', identifier: '918888888888', user_ip: '10.9.9.9' })],
      },
    };
    renderWithProviders(<Msg91LogsPage />);
    await screen.findByTestId('row-req-1');
    expect((await searchRows('918888'))?.rows).toEqual([expect.objectContaining({ request_id: 'req-2' })]);
    expect((await searchRows('req-1'))?.rows).toEqual([expect.objectContaining({ request_id: 'req-1' })]);
    expect((await searchRows('10.9.9.9'))?.rows).toHaveLength(1);
    expect((await searchRows('nothing'))?.rows).toEqual([]);

    const row = logRow();
    expect(columnValue('identifier', row)).toBe('919000000000');
    expect(columnValue('verified', row)).toBe(true);
    expect(columnValue('token_verified', row)).toBe(false);
    expect(columnValue('verify_attempts', row)).toBe(2);
    expect(columnValue('retries', row)).toBe(1);
    expect(columnValue('request_id', row)).toBe('req-1');
    expect(columnValue('user_ip', row)).toBe('10.0.0.1');
    expect(columnValue('channels', row)).toBe('SMS ×2 · WhatsApp ×1');
  });

  it('refreshes when Load is pressed for the same window', async () => {
    m.report = { msg91WidgetLogs: { total: 1, rows: [logRow()] } };
    renderWithProviders(<Msg91LogsPage />);
    fireEvent.click(screen.getByRole('button', { name: /load/i }));
    await waitFor(() => expect(m.refetch).toHaveBeenCalledTimes(1));
  });
});

describe('Msg91AnalyticsPage', () => {
  const analytics = () => ({
    msg91WidgetAnalytics: {
      days: [day('2026-08-05', 40, 30), day('2026-08-06', 60, 54)],
      total: day('total', 100, 84),
    },
  });

  it('shows the window totals with the verification rate, the chart and the daily table', async () => {
    m.report = analytics();
    renderWithProviders(<Msg91AnalyticsPage />);
    expect(await screen.findByTestId('row-2026-08-05')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText(/84%/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'chart' })).toHaveTextContent('40,60');
  });

  it('shows a dash for the rate when nothing was requested', async () => {
    m.report = {
      msg91WidgetAnalytics: { days: [day('2026-08-05', 0, 0)], total: day('total', 0, 0) },
    };
    renderWithProviders(<Msg91AnalyticsPage />);
    expect(await screen.findByText('— of requests were verified')).toBeInTheDocument();
  });

  it('searches the daily table by date', async () => {
    m.report = analytics();
    renderWithProviders(<Msg91AnalyticsPage />);
    await screen.findByTestId('row-2026-08-05');
    expect((await searchRows('2026-08-06'))?.rows).toEqual([expect.objectContaining({ date: '2026-08-06' })]);
    expect((await searchRows('1999'))?.rows).toEqual([]);
  });

  it('draws neither board nor empty notice before MSG91 has answered', () => {
    m.report = undefined;
    renderWithProviders(<Msg91AnalyticsPage />);
    expect(screen.queryByText('No OTP traffic in this window.')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'chart' })).not.toBeInTheDocument();
  });

  it('says there was no traffic for an empty window', async () => {
    m.report = { msg91WidgetAnalytics: { days: [], total: null } };
    renderWithProviders(<Msg91AnalyticsPage />);
    expect(await screen.findByText('No OTP traffic in this window.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'chart' })).not.toBeInTheDocument();
  });
});

describe('useMsg91Report', () => {
  const mount = () =>
    renderHook(() => useMsg91Report(MSG91_WIDGET_LOGS, 3), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

  it('starts on the widest window ending today', () => {
    const { result } = mount();
    expect(result.current.range).toEqual(windowEndingToday(3));
    expect(m.vars[0]).toEqual({
      start_date: result.current.range.start,
      end_date: result.current.range.end,
    });
  });

  it('moves the window for a different range and refetches for the same one', () => {
    const { result } = mount();
    act(() => result.current.onRange({ start: '2026-08-01', end: '2026-08-02' }));
    expect(result.current.range).toEqual({ start: '2026-08-01', end: '2026-08-02' });
    expect(m.refetch).not.toHaveBeenCalled();
    act(() => result.current.onRange({ start: '2026-08-01', end: '2026-08-02' }));
    expect(m.refetch).toHaveBeenCalledTimes(1);
  });

  it('survives a failed refetch', async () => {
    m.refetch.mockRejectedValue(new Error('network'));
    const { result } = mount();
    await act(async () => {
      result.current.onRange(result.current.range);
    });
    expect(m.refetch).toHaveBeenCalled();
  });

  it('survives a refetch that rejects with something that is not an Error', async () => {
    m.refetch.mockRejectedValue('offline');
    const { result } = mount();
    await act(async () => {
      result.current.onRange(result.current.range);
    });
    expect(m.refetch).toHaveBeenCalledTimes(1);
  });

  it('asks nothing while MSG91 is not configured', () => {
    m.configured = false;
    mount();
    expect(m.skipped.at(-1)).toBe(true);
  });
});

describe('makeDateWindowSchema', () => {
  const t = (key: string) => key;
  const schema = makeDateWindowSchema(t as never, 3);
  const messages = (start: string, end: string) => {
    const result = schema.safeParse({ start, end });
    return result.success ? [] : result.error.issues.map((i) => i.message);
  };

  it('accepts a window inside the limit', () => {
    expect(messages('2026-08-01', '2026-08-03')).toEqual([]);
  });

  it('requires both days', () => {
    expect(messages('', '2026-08-03')).toContain('tech.msg91.validation.dateRequired');
  });

  it('refuses an end before the start and a window wider than the limit', () => {
    expect(messages('2026-08-03', '2026-08-01')).toContain('tech.msg91.validation.rangeOrder');
    expect(messages('2026-08-01', '2026-08-10')).toContain('tech.msg91.validation.rangeTooWide');
  });

  it('refuses a window ending in the future', () => {
    expect(messages('2999-01-01', '2999-01-02')).toContain('tech.msg91.validation.futureDate');
  });
});
