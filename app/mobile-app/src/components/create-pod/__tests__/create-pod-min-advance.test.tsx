import { format } from 'date-fns';

import { makeCreatePodSchema, parseDateTimeText } from '@/components/create-pod/create-pod.form';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';
import { fallbackT } from '@/i18n/fallback';

/**
 * Minimum Advance Days for Pod Creation on the app: a host's pod must start on
 * or after their first allowed day — refused here exactly as mWeb and the
 * server refuse it. A Club Admin's stepper passes no rule.
 */

// With no admin settings loaded the schedule is typed in the fallback pattern.
const TYPED_PATTERN = 'dd MM yyyy hh:mm a';
const startText = format(new Date(Date.now() + 3 * 86_400_000), TYPED_PATTERN);
const startMs = parseDateTimeText(startText)?.getTime() ?? Number.NaN;

const virtualPod = (start: string): CreatePodFormValues => ({
  ...blankCreatePodForm,
  pod_mode: 'VIRTUAL',
  meeting_platform: 'GOOGLE_MEET',
  meeting_url: 'https://meet.duncit.com/x',
  pod_date_time_text: start,
  pod_end_date_time_text: format(new Date(startMs + 2 * 3_600_000), TYPED_PATTERN),
});

const startMessages = (schema: ReturnType<typeof makeCreatePodSchema>, start: string) => {
  const result = schema.safeParse(virtualPod(start));
  return result.success
    ? []
    : result.error.issues
        .filter((issue) => issue.path[0] === 'pod_date_time_text')
        .map((issue) => issue.message);
};

const withRule = (rule: { days: number; startMs: number }) =>
  makeCreatePodSchema(fallbackT, undefined, undefined, rule);

describe('create pod schema — Minimum Advance Days', () => {
  it('refuses a start before the first allowed day with the host-facing sentence', () => {
    expect(startMessages(withRule({ days: 4, startMs: startMs + 60_000 }), startText)).toEqual([
      'You can only create a Pod scheduled at least 4 days in advance from the current date.',
    ]);
  });

  it('says "1 day" for a one-day rule', () => {
    expect(startMessages(withRule({ days: 1, startMs: startMs + 60_000 }), startText)).toEqual([
      'You can only create a Pod scheduled at least 1 day in advance from the current date.',
    ]);
  });

  it('accepts a start exactly at the first allowed midnight', () => {
    expect(startMessages(withRule({ days: 3, startMs }), startText)).toEqual([]);
  });

  it('keeps only the past-start message for a past start', () => {
    expect(startMessages(withRule({ days: 3, startMs }), '01 01 2020 10:00 AM')).toEqual([
      fallbackT('mweb.createPod.validation.startFuture'),
    ]);
  });

  it('adds nothing with no rule (unknown yet, or a Club Admin’s pod)', () => {
    expect(startMessages(makeCreatePodSchema(fallbackT), startText)).toEqual([]);
  });
});
