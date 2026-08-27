/**
 * The meeting dialogs' copy is built per surface namespace. Two things must
 * hold: every entry reads the LITERAL key its namespace owns (the shipped-keys
 * gate greps for it), and the two interpolated lines hand their values to the
 * translator as `vars` rather than baking them into the key.
 */
import { describe, expect, it } from 'vitest';

import {
  buildEarnMeetingLabels,
  mwebEarnMeetingLabels,
  shellEarnMeetingLabels,
  type EarnTranslate,
} from '../src/labels';

type Call = { key: string; vars?: Record<string, string | number> };

const recorder = () => {
  const calls: Call[] = [];
  const t: EarnTranslate = (key, options) => {
    calls.push({ key, vars: options?.vars });
    return key;
  };
  return { t, calls };
};

describe('mwebEarnMeetingLabels', () => {
  it('reads every static line from the mweb namespace', () => {
    const { t } = recorder();
    const labels = mwebEarnMeetingLabels(t);

    expect(labels.cancelTitle).toBe('mweb.earnMeeting.cancelTitle');
    expect(labels.rescheduleTitle).toBe('mweb.earnMeeting.rescheduleTitle');
    expect(labels.reasonRequired).toBe('mweb.earnMeeting.reasonRequired');
    expect(labels.aiMonitoring).toBe('mweb.earnMeeting.aiMonitoring');
  });

  it('passes the booked time and the move as vars', () => {
    const { t, calls } = recorder();
    const labels = mwebEarnMeetingLabels(t);

    expect(labels.currentlyBooked('12 Sep 2026, 18:00')).toBe('mweb.earnMeeting.currentlyBooked');
    expect(labels.movingFromTo('12 Sep', '14 Sep')).toBe('mweb.earnMeeting.movingFromTo');

    expect(calls.at(-2)).toEqual({
      key: 'mweb.earnMeeting.currentlyBooked',
      vars: { when: '12 Sep 2026, 18:00' },
    });
    expect(calls.at(-1)).toEqual({
      key: 'mweb.earnMeeting.movingFromTo',
      vars: { from: '12 Sep', to: '14 Sep' },
    });
  });
});

describe('shellEarnMeetingLabels', () => {
  it('reads every static line from the shell namespace', () => {
    const { t } = recorder();
    const labels = shellEarnMeetingLabels(t);

    expect(labels.cancelTitle).toBe('shell.earnMeeting.cancelTitle');
    expect(labels.rescheduleTitle).toBe('shell.earnMeeting.rescheduleTitle');
    expect(labels.reasonTooLong).toBe('shell.earnMeeting.reasonTooLong');
    expect(labels.moveCta).toBe('shell.earnMeeting.moveCta');
  });

  it('passes the booked time and the move as vars', () => {
    const { t, calls } = recorder();
    const labels = shellEarnMeetingLabels(t);

    expect(labels.currentlyBooked('1 Oct 2026, 11:30')).toBe('shell.earnMeeting.currentlyBooked');
    expect(labels.movingFromTo('1 Oct', '3 Oct')).toBe('shell.earnMeeting.movingFromTo');

    expect(calls.at(-2)).toEqual({
      key: 'shell.earnMeeting.currentlyBooked',
      vars: { when: '1 Oct 2026, 11:30' },
    });
    expect(calls.at(-1)).toEqual({
      key: 'shell.earnMeeting.movingFromTo',
      vars: { from: '1 Oct', to: '3 Oct' },
    });
  });
});

describe('buildEarnMeetingLabels', () => {
  it('picks the mweb namespace for mWeb and the native app', () => {
    const labels = buildEarnMeetingLabels(recorder().t, 'mweb');

    expect(labels.cancelCta).toBe('mweb.earnMeeting.cancelCta');
    expect(labels.movingFromTo('a', 'b')).toBe('mweb.earnMeeting.movingFromTo');
  });

  it('picks the shell namespace for the portals', () => {
    const labels = buildEarnMeetingLabels(recorder().t, 'shell');

    expect(labels.cancelCta).toBe('shell.earnMeeting.cancelCta');
    expect(labels.currentlyBooked('now')).toBe('shell.earnMeeting.currentlyBooked');
  });

  it('keeps the two namespaces word-for-word aligned on their key suffixes', () => {
    const mweb = buildEarnMeetingLabels(recorder().t, 'mweb');
    const shell = buildEarnMeetingLabels(recorder().t, 'shell');
    const suffix = (value: string) => value.replace(/^(mweb|shell)\./, '');

    const mwebKeys = Object.entries(mweb)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([, value]) => suffix(value));
    const shellKeys = Object.entries(shell)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([, value]) => suffix(value));

    expect(mwebKeys.length).toBeGreaterThan(0);
    expect(shellKeys).toEqual(mwebKeys);
  });
});
