/**
 * Minimum Advance Days for Pod Creation on mWeb: a host's pod must start on or
 * after the day N calendar days from today (their Hosts-console override, else
 * Pod Settings). The schema refuses an earlier start and a note says why; the
 * calendars are in createPodMinAdvanceCalendars.
 */
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { fallbackT } from '../../../i18n/fallback';
import { makeCreatePodSchema } from '../create-pod/create-pod.form';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod/create-pod.types';
import MinAdvanceNote from '../create-pod/MinAdvanceNote';
import { MY_POD_MIN_ADVANCE_DAYS, usePodMinAdvance } from '../create-pod/usePodMinAdvance';

const h = vi.hoisted(() => ({
  today: '2026-11-10',
}));

vi.mock('../../../utils/dateFormat', async (orig) => ({
  ...(await orig<object>()),
  useDateFormat: () => ({
    dayKey: () => h.today,
    timeZone: 'Asia/Kolkata',
    clock: { nowMs: () => Date.parse('2026-11-10T08:30:00.000Z') },
  }),
}));

// 10 Nov in Kolkata + 5 days → 15 Nov, from local midnight.
const FIVE_DAYS = { days: 5, day: '2026-11-15', startMs: Date.parse('2026-11-14T18:30:00.000Z') };

describe('usePodMinAdvance', () => {
  const wrapper = (days: number | null) =>
    function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
      const mocks =
        days === null
          ? []
          : [{ request: { query: MY_POD_MIN_ADVANCE_DAYS }, result: { data: { myPodMinAdvanceDays: days } } }];
      return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
    };

  it('is null until the server answers, then the host’s days and first allowed day', async () => {
    const { result } = renderHook(() => usePodMinAdvance(), { wrapper: wrapper(5) });
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toEqual(FIVE_DAYS));
  });

  it('stays null when the read fails, so nothing is narrowed on a guess', async () => {
    const { result } = renderHook(() => usePodMinAdvance(), { wrapper: wrapper(null) });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toBeNull();
  });
});

describe('makeCreatePodSchema — Minimum Advance Days', () => {
  const values = (start: Date): CreatePodFormValues => ({
    ...blankCreatePodForm,
    pod_mode: 'VIRTUAL',
    pod_date_time: start,
    pod_end_date_time: new Date(start.getTime() + 2 * 3_600_000),
  });
  const startIssues = (schema: ReturnType<typeof makeCreatePodSchema>, start: Date) => {
    const result = schema.safeParse(values(start));
    return result.success ? [] : result.error.issues.filter((i) => i.path[0] === 'pod_date_time').map((i) => i.message);
  };
  const future = Date.now() + 3 * 86_400_000;
  const rule = { days: 3, startMs: future };
  const tooSoon = fallbackT('mweb.createPod.validation.startTooSoon', { count: 3 });

  it('refuses a start before the first allowed day with the host-facing sentence', () => {
    expect(tooSoon).toBe('You can only create a Pod scheduled at least 3 days in advance from the current date.');
    expect(startIssues(makeCreatePodSchema(fallbackT, undefined, undefined, undefined, rule), new Date(future - 60_000))).toEqual([
      tooSoon,
    ]);
  });

  it('accepts a start exactly on the first allowed midnight, and later', () => {
    const schema = makeCreatePodSchema(fallbackT, undefined, undefined, undefined, rule);
    expect(startIssues(schema, new Date(future))).toEqual([]);
    expect(startIssues(schema, new Date(future + 86_400_000))).toEqual([]);
  });

  it('keeps the past-start message for a start in the past, rather than both', () => {
    const schema = makeCreatePodSchema(fallbackT, undefined, undefined, undefined, rule);
    expect(startIssues(schema, new Date(Date.now() - 60_000))).toEqual([fallbackT('mweb.createPod.validation.startFuture')]);
  });

  it('adds nothing while the rule is not known', () => {
    expect(startIssues(makeCreatePodSchema(), new Date(Date.now() + 3_600_000))).toEqual([]);
  });
});

describe('MinAdvanceNote', () => {
  it('tells the host how many days ahead they must schedule, singular and plural', () => {
    const { rerender } = render(<MinAdvanceNote minAdvance={FIVE_DAYS} />);
    expect(screen.getByTestId('create-pod-min-advance-note')).toHaveTextContent(
      'You can only create a Pod scheduled at least 5 days in advance from the current date.',
    );
    rerender(<MinAdvanceNote minAdvance={{ ...FIVE_DAYS, days: 1 }} />);
    expect(screen.getByTestId('create-pod-min-advance-note')).toHaveTextContent('at least 1 day in advance');
  });

  it('renders nothing while the rule is unknown', () => {
    render(<MinAdvanceNote minAdvance={null} />);
    expect(screen.queryByTestId('create-pod-min-advance-note')).toBeNull();
  });
});
