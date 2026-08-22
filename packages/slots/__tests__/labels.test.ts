import { describe, expect, it } from 'vitest';

import {
  buildSlotLabels,
  mwebCurrentLabel,
  mwebMeetingLabels,
  mwebSlotLabels,
  shellCurrentLabel,
  shellMeetingLabels,
  shellSlotLabels,
} from '../src/labels';

/** Echoes the key back, so a test can read which key each label came from. */
const t = (key: string) => key;

const SLOT_FIELDS = [
  'date',
  'hint',
  'availableSlots',
  'free',
  'today',
  'tomorrow',
  'loading',
  'empty',
  'emptyDay',
  'previousMonth',
  'nextMonth',
  'pickVenueFirst',
  'currentlyBooked',
  'wholeVenue',
  'wholeDay',
] as const;

describe('the two namespaces', () => {
  it('reads mWeb copy from mweb.slots.* — the namespace native shares with it', () => {
    const labels = mwebSlotLabels(t);

    expect(Object.keys(labels).sort()).toEqual([...SLOT_FIELDS].sort());
    for (const field of SLOT_FIELDS) expect(labels[field]).toBe(`mweb.slots.${field}`);
  });

  it('reads portal copy from shell.slots.*', () => {
    const labels = shellSlotLabels(t);

    expect(Object.keys(labels).sort()).toEqual([...SLOT_FIELDS].sort());
    for (const field of SLOT_FIELDS) expect(labels[field]).toBe(`shell.slots.${field}`);
  });

  it('ships no English literal of its own — every value came from the translator', () => {
    const seen: string[] = [];
    mwebSlotLabels((key) => {
      seen.push(key);
      return 'translated';
    });

    expect(seen).toHaveLength(SLOT_FIELDS.length);
    expect(new Set(Object.values(mwebSlotLabels(() => 'translated')))).toEqual(new Set(['translated']));
  });
});

describe('buildSlotLabels', () => {
  it('picks the namespace the calling surface ships', () => {
    expect(buildSlotLabels(t, 'mweb.slots')).toEqual(mwebSlotLabels(t));
    expect(buildSlotLabels(t, 'shell.slots')).toEqual(shellSlotLabels(t));
  });
});

describe('meeting labels', () => {
  it('replaces only the hint, because a booked meeting slot stays visible instead of vanishing', () => {
    const meeting = mwebMeetingLabels(t, false);

    expect(meeting.hint).toBe('mweb.slots.meetingHint');
    expect({ ...meeting, hint: mwebSlotLabels(t).hint }).toEqual(mwebSlotLabels(t));
  });

  it('says something different when the user is rescheduling', () => {
    expect(mwebMeetingLabels(t, true).hint).toBe('mweb.slots.meetingRescheduleHint');
    expect(shellMeetingLabels(t, true).hint).toBe('shell.slots.meetingRescheduleHint');
    expect(shellMeetingLabels(t, false).hint).toBe('shell.slots.meetingHint');
  });
});

describe('the badge on the slot a rescheduling user holds', () => {
  it('comes from each surface’s own namespace', () => {
    expect(mwebCurrentLabel(t)).toBe('mweb.slots.current');
    expect(shellCurrentLabel(t)).toBe('shell.slots.current');
  });
});
