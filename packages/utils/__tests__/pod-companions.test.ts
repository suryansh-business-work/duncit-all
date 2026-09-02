import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIAL_CODE,
  areCompanionEntriesComplete,
  blankCompanionEntries,
  companionEntriesToInput,
  companionOtpState,
  isCompanionEntryComplete,
  type CompanionEntry,
} from '../src/pod-attendance';

const entry = (over: Partial<CompanionEntry> = {}): CompanionEntry => ({
  name: 'Riya Sharma',
  phone_extension: DEFAULT_DIAL_CODE,
  phone_number: '9845012345',
  otp_challenge_id: '',
  ...over,
});

describe('the blank rows the door starts with', () => {
  it('makes as many as the booking admits, prefilled with the market dial code', () => {
    const rows = blankCompanionEntries(3);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      name: '',
      phone_extension: '+91',
      phone_number: '',
      otp_challenge_id: '',
    });
  });

  it('makes fresh objects, so typing in one row does not fill the others', () => {
    const rows = blankCompanionEntries(2);
    rows[0].name = 'Riya Sharma';
    expect(rows[1].name).toBe('');
  });

  it('treats a nonsense count as no rows rather than throwing', () => {
    expect(blankCompanionEntries(0)).toEqual([]);
    expect(blankCompanionEntries(-2)).toEqual([]);
  });
});

describe('whether one companion can be recorded', () => {
  it('accepts a filled-in row', () => {
    expect(isCompanionEntryComplete(entry())).toBe(true);
  });

  it('wants a real name, not an initial', () => {
    expect(isCompanionEntryComplete(entry({ name: 'R' }))).toBe(false);
    expect(isCompanionEntryComplete(entry({ name: '  ' }))).toBe(false);
    expect(isCompanionEntryComplete(entry({ name: ' Al ' }))).toBe(true);
  });

  it('checks both halves of the number', () => {
    expect(isCompanionEntryComplete(entry({ phone_number: '98450' }))).toBe(false);
    expect(isCompanionEntryComplete(entry({ phone_extension: 'IN' }))).toBe(false);
  });

  it('never asks for a code — an unreachable number must not hold the group', () => {
    // The whole reason verification is an option and not a gate: the person is
    // standing at the door, and their phone being off is not a reason to
    // refuse them the pod.
    expect(isCompanionEntryComplete(entry({ otp_challenge_id: '' }))).toBe(true);
  });
});

describe('whether the whole group can be recorded', () => {
  it('needs every row filled in', () => {
    expect(areCompanionEntriesComplete([entry(), entry()])).toBe(true);
    expect(areCompanionEntriesComplete([entry(), entry({ phone_number: '' })])).toBe(false);
  });

  it('is false with no rows at all, not vacuously true', () => {
    expect(areCompanionEntriesComplete([])).toBe(false);
  });
});

describe('the rows as the scan sends them', () => {
  it('trims every field, so one side cannot record a different name', () => {
    const input = companionEntriesToInput([
      entry({ name: ' Riya Sharma ', phone_extension: ' +91 ', phone_number: ' 9845012345 ' }),
    ]);
    expect(input).toEqual([
      {
        name: 'Riya Sharma',
        phone_extension: '+91',
        phone_number: '9845012345',
        otp_challenge_id: null,
      },
    ]);
  });

  it('carries a verified challenge through, and sends null when there is none', () => {
    const [verified, plain] = companionEntriesToInput([
      entry({ otp_challenge_id: 'chal_9f21' }),
      entry(),
    ]);
    expect(verified.otp_challenge_id).toBe('chal_9f21');
    expect(plain.otp_challenge_id).toBeNull();
  });
});

describe('what a row’s verify control is doing', () => {
  it('is VERIFIED once this number answered a code', () => {
    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 0, 0)).toBe('VERIFIED');
    // Verified wins even while another row holds the live challenge.
    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 1, 0)).toBe('VERIFIED');
  });

  it('BLOCKS every other row while one challenge is open', () => {
    // One at a time is the point: two live codes at a door is how the wrong
    // person gets ticked.
    expect(companionOtpState(entry(), 1, 0)).toBe('BLOCKED');
  });

  it('leaves the row holding the challenge free to act', () => {
    expect(companionOtpState(entry(), 0, 0)).toBe('READY');
  });

  it('is INCOMPLETE while there is no number to send to', () => {
    expect(companionOtpState(entry({ phone_number: '' }), 0, null)).toBe('INCOMPLETE');
  });

  it('is READY when nothing is in flight and the row is filled in', () => {
    expect(companionOtpState(entry(), 0, null)).toBe('READY');
  });
});
