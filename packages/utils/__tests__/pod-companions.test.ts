import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIAL_CODE,
  OTP_PHONE_MIN_DIGITS,
  areCompanionEntriesComplete,
  blankCompanionEntries,
  companionEntriesToInput,
  companionOtpState,
  duplicateCompanionIndexes,
  isCompanionEntryComplete,
  isVerifiablePhoneShape,
  namedCompanionEntries,
  phoneKey,
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
    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 0, 0, false)).toBe('VERIFIED');
    // Verified wins even while another row holds the live challenge, and even
    // where the number is one somebody else on the ticket also typed: this row
    // already proved it, so it is theirs.
    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 1, 0, true)).toBe('VERIFIED');
  });

  it('BLOCKS every other row while one challenge is open', () => {
    // One at a time is the point: two live codes at a door is how the wrong
    // person gets ticked.
    expect(companionOtpState(entry(), 1, 0, false)).toBe('BLOCKED');
  });

  it('leaves the row holding the challenge free to act', () => {
    expect(companionOtpState(entry(), 0, 0, false)).toBe('READY');
  });

  it('is INCOMPLETE while there is no number to send to', () => {
    expect(companionOtpState(entry({ phone_number: '' }), 0, null, false)).toBe('INCOMPLETE');
  });

  it('is READY when nothing is in flight and the row is filled in', () => {
    expect(companionOtpState(entry(), 0, null, false)).toBe('READY');
  });
});

describe('the names a Club Admin was read', () => {
  it('drops a row nobody named, so a blank line never holds the mark', () => {
    // The admin records what a phone call told them; refusing the mark for the
    // names they were NOT given is the dead end this path exists to remove.
    expect(
      namedCompanionEntries([entry({ name: '' }), entry({ name: ' R ' })]),
    ).toEqual([]);
  });

  it('trims what was typed and keeps a number when there is one', () => {
    expect(
      namedCompanionEntries([
        entry({ name: ' Riya Sharma ', phone_extension: ' +91 ', phone_number: ' 9845012345 ' }),
      ]),
    ).toEqual([{ name: 'Riya Sharma', phone_extension: '+91', phone_number: '9845012345' }]);
  });

  it('drops a dial code with no number behind it, which is noise on the record', () => {
    expect(namedCompanionEntries([entry({ phone_number: '  ' })])).toEqual([
      { name: 'Riya Sharma', phone_extension: '', phone_number: '' },
    ]);
  });

  it('never sends otp_challenge_id — PodForcedCompanionInput does not declare it', () => {
    const [first] = namedCompanionEntries([entry({ otp_challenge_id: 'chal_9f21' })]);
    expect(first).not.toHaveProperty('otp_challenge_id');
  });
});

describe('the comparable form of a phone number', () => {
  // The same phone reaches the door written three ways, and a check that reads
  // those as three different people is not a check.
  it('keys the same line to the same string however it was written', () => {
    const key = phoneKey('+91', '98765 43210');
    expect(phoneKey('', '919876543210')).toBe(key);
    expect(phoneKey('+91 ', ' 9876543210 ')).toBe(key);
    expect(key).toBe('9876543210');
  });

  // Past ten digits only the last ten count — that is what makes a country
  // code optional. Shorter numbers have nothing to trim and compare whole.
  it('takes the last ten digits, and keeps a shorter number entire', () => {
    expect(phoneKey('+91', '9876543210')).toHaveLength(OTP_PHONE_MIN_DIGITS);
    expect(phoneKey('', '98765')).toBe('98765');
  });

  it('has no key at all for a line with no digits in it', () => {
    expect(phoneKey('')).toBe('');
    expect(phoneKey('+', ' ')).toBe('');
  });
});

describe('whether a number is worth spending a code on', () => {
  // The door waits for the WHOLE number: a code sent to half of one proves
  // nothing and is spent.
  it('turns true exactly at the length a code can reach', () => {
    expect(isVerifiablePhoneShape('9876543210')).toBe(true);
    expect(isVerifiablePhoneShape('987654321')).toBe(false);
    expect(isVerifiablePhoneShape(' 9876543210 ')).toBe(true);
  });

  it('refuses anything that is not plain digits, at any length', () => {
    expect(isVerifiablePhoneShape('+919876543210')).toBe(false);
    expect(isVerifiablePhoneShape('98765 43210')).toBe(false);
    expect(isVerifiablePhoneShape('')).toBe(false);
  });
});

describe('the rows whose number somebody else already has', () => {
  // One number is one person. A ticket that admits eight admits eight people,
  // so the same number cannot stand for two of them.
  it('reports the second row to type a number, not the first', () => {
    const rows = [entry({ phone_number: '9845012345' }), entry({ phone_number: '9845012345' })];
    expect([...duplicateCompanionIndexes(rows, [])]).toEqual([1]);
  });

  // The reserved list is the buyer's own phone and WhatsApp plus everyone already
  // recorded against the ticket — their numbers are taken before anyone types.
  it('counts the buyer’s own numbers as taken, however they were written', () => {
    const rows = [entry({ phone_number: '9845012345' })];
    expect([...duplicateCompanionIndexes(rows, ['+91 98450 12345'])]).toEqual([0]);
  });

  it('ignores a reserved line with no digits in it', () => {
    const rows = [entry({ phone_number: '9845012345' })];
    expect(duplicateCompanionIndexes(rows, ['', '  ']).size).toBe(0);
  });

  // A proved row keeps its number whatever order the form was filled in: the
  // seed pass runs before the walk, so the row asked to change is the unproved
  // one even when it was typed FIRST.
  it('leaves a proved row alone and moves the repeat onto the unproved one', () => {
    const rows = [
      entry({ phone_number: '9845012345' }),
      entry({ phone_number: '9845012345', otp_challenge_id: 'chal_9f21' }),
    ];
    expect([...duplicateCompanionIndexes(rows, [])]).toEqual([0]);
  });

  // Every blank row on a fresh ticket carries the prefilled dial code, so a
  // check that keyed the whole row would read '+91' as a phone number and
  // report every row after the first as a repeat before anybody typed.
  it('says nothing about rows with no number typed yet, dial code and all', () => {
    const rows = [entry({ phone_number: '' }), entry({ phone_number: '  ' }), entry({ phone_number: '' })];
    expect(duplicateCompanionIndexes(rows, []).size).toBe(0);
  });

  it('does not let a blank row shadow a real number typed under the same dial code', () => {
    const rows = [entry({ phone_number: '' }), entry({ phone_number: '9845012345' })];
    expect(duplicateCompanionIndexes(rows, []).size).toBe(0);
  });
});

describe('a row whose number is already spoken for', () => {
  // Sending it a code would tick a second seat off the back of one person
  // answering once, so the control says so instead of offering to send.
  it('is DUPLICATE rather than READY', () => {
    expect(companionOtpState(entry(), 0, null, true)).toBe('DUPLICATE');
  });

  // The order is the order the host meets the problems in: someone else's
  // code in flight stops every row, before the number is even looked at.
  it('still yields to a challenge open on another row', () => {
    expect(companionOtpState(entry(), 1, 0, true)).toBe('BLOCKED');
  });

  it('is INCOMPLETE while the number is only half typed', () => {
    expect(companionOtpState(entry({ phone_number: '98450' }), 0, null, false)).toBe('INCOMPLETE');
    // Complete as a row, but not yet long enough for a code to reach.
    expect(companionOtpState(entry({ phone_number: '984501234' }), 0, null, false)).toBe(
      'INCOMPLETE',
    );
  });
});
