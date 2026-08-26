import { addDays, addMinutes, isSameDay, set as setTimeOnDate, startOfDay } from 'date-fns';
import { wholeDayWindow } from './slot-window';

/** Mirror the server cap: availability is publishable at most this far ahead. */
export const MAX_FUTURE_DAYS = 60;

/** '' is a real space label (the whole venue), so the "nothing picked yet"
 *  sentinel has to be something a label can never be. */
export const NO_SPACE = ' ';

/**
 * Everything the partner fills in before a slot is sent — one object rather
 * than nine pieces of state, so the form and its fields share exactly one
 * shape and a reset is a single assignment.
 */
export interface SlotDraft {
  wholeDay: boolean;
  startDate: Date | null;
  endDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  price: string;
  notes: string;
  /** '' is a real value here (whole venue), so "not picked yet" is NO_SPACE. */
  spaceLabel: string;
}

export const emptyDraft = (date: Date): SlotDraft => ({
  wholeDay: false,
  startDate: date,
  endDate: date,
  startTime: null,
  endTime: null,
  price: '',
  notes: '',
  spaceLabel: NO_SPACE,
});

/** The one thing wrong with a draft. `pickDates` / `pickSlotTimes` mean it is
 *  simply not filled in yet; the rest are real rejections. */
export type SlotIssueCode =
  | 'pickDates'
  | 'pickSlotTimes'
  | 'endDateAfterStart'
  | 'sameTime'
  | 'endAfterStart'
  | 'startInFuture'
  | 'maxAhead';

const INCOMPLETE = new Set<SlotIssueCode>(['pickDates', 'pickSlotTimes']);

/** True while the draft is merely unfinished — worth saying when the partner
 *  presses Add, never worth shouting at them mid-typing. */
export function isDraftIncomplete(code: SlotIssueCode): boolean {
  return INCOMPLETE.has(code);
}

function combineDateAndTime(date: Date, time: Date): Date {
  return setTimeOnDate(date, {
    hours: time.getHours(),
    minutes: time.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
}

/**
 * The rules a concrete window has to pass, so the whole-day branch and the
 * timed branch are judged by exactly one set of them.
 *
 * A whole-day window is exempt from the past check because `wholeDayWindow`
 * has already clamped its start away from a midnight that has gone by.
 */
function windowIssue(
  window: { start: Date; end: Date },
  wholeDay: boolean,
  now: Date,
): SlotIssueCode | null {
  const start = window.start.getTime();
  const end = window.end.getTime();
  if (start === end) return 'sameTime';
  if (end < start) return 'endAfterStart';
  if (!wholeDay && start < now.getTime()) return 'startInFuture';
  if (start > addDays(now, MAX_FUTURE_DAYS).getTime()) return 'maxAhead';
  return null;
}

/**
 * The window a draft asks for, or the one thing wrong with it.
 *
 * `now` is a parameter rather than a `new Date()` taken inside, so the caller
 * can re-judge the same draft against a moving clock: a 6pm slot typed at 5:59
 * has to stop being addable at 6:01 without anyone touching the form.
 */
export function checkSlotDraft(
  draft: SlotDraft,
  now: Date,
): { start: Date; end: Date } | SlotIssueCode {
  const { startDate, endDate, startTime, endTime, wholeDay } = draft;
  if (!startDate || !endDate) return 'pickDates';
  if (startOfDay(endDate).getTime() < startOfDay(startDate).getTime()) {
    return 'endDateAfterStart';
  }
  if (wholeDay) {
    const window = wholeDayWindow(startDate, endDate, now);
    return windowIssue(window, true, now) ?? window;
  }
  if (!startTime || !endTime) return 'pickSlotTimes';
  const window = {
    start: combineDateAndTime(startDate, startTime),
    end: combineDateAndTime(endDate, endTime),
  };
  return windowIssue(window, false, now) ?? window;
}

/** The earliest time a picker may offer for `date`: "now" when that date is
 *  today, so a time that has already passed cannot even be selected. */
export function minTimeOn(date: Date | null, now: Date): Date | undefined {
  if (!date || !isSameDay(date, now)) return undefined;
  return now;
}

/** The earliest END time: a minute past the start while the slot sits on one
 *  day, which is what makes "same time" and "end before start" unpickable
 *  rather than merely rejected after the fact. */
export function minEndTime(draft: SlotDraft, now: Date): Date | undefined {
  const { startDate, endDate, startTime } = draft;
  if (startTime && startDate && endDate && isSameDay(startDate, endDate)) {
    return addMinutes(startTime, 1);
  }
  return minTimeOn(endDate, now);
}

/** The `t` this module needs, structurally — the package must not depend on
 *  the translator's own types to turn a code into a sentence. */
export type Translate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/** The one place a draft's problem becomes a sentence. Written as literal keys
 *  because the localization gate reads them statically (rule 38). */
export function slotIssueMessage(code: SlotIssueCode, t: Translate): string {
  if (code === 'pickDates') return t('shell.availability.pickDates');
  if (code === 'pickSlotTimes') return t('shell.availability.pickSlotTimes');
  if (code === 'endDateAfterStart') return t('shell.availability.endDateAfterStart');
  if (code === 'sameTime') return t('shell.availability.sameTime');
  if (code === 'endAfterStart') return t('shell.availability.endAfterStart');
  if (code === 'startInFuture') return t('shell.availability.startInFuture');
  return t('shell.availability.maxAhead', { vars: { days: MAX_FUTURE_DAYS } });
}
