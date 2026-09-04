import fs from 'node:fs';

const P = 'packages/utils/__tests__/pod-companions.test.ts';
const raw = fs.readFileSync(P, 'utf8');
const crlf = raw.includes('\r\n');
let s = crlf ? raw.split('\r\n').join('\n') : raw;

const rep = (a, b) => {
  if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 60));
  s = s.replace(a, () => b);
};

rep(
  `import {
  DEFAULT_DIAL_CODE,
  areCompanionEntriesComplete,
  blankCompanionEntries,
  companionEntriesToInput,
  companionOtpState,
  isCompanionEntryComplete,
  namedCompanionEntries,
  type CompanionEntry,
} from '../src/pod-attendance';`,
  `import {
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
} from '../src/pod-attendance';`,
);

// The fourth argument arrived with the duplicate rule; the existing cases all
// describe a row whose number nobody else has.
rep(
  `    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 0, 0)).toBe('VERIFIED');
    // Verified wins even while another row holds the live challenge.
    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 1, 0)).toBe('VERIFIED');`,
  `    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 0, 0, false)).toBe('VERIFIED');
    // Verified wins even while another row holds the live challenge, and even
    // where the number is one somebody else on the ticket also typed: this row
    // already proved it, so it is theirs.
    expect(companionOtpState(entry({ otp_challenge_id: 'chal_9f21' }), 1, 0, true)).toBe('VERIFIED');`,
);

rep(`    expect(companionOtpState(entry(), 1, 0)).toBe('BLOCKED');`,
    `    expect(companionOtpState(entry(), 1, 0, false)).toBe('BLOCKED');`);

rep(`    expect(companionOtpState(entry(), 0, 0)).toBe('READY');`,
    `    expect(companionOtpState(entry(), 0, 0, false)).toBe('READY');`);

rep(`    expect(companionOtpState(entry({ phone_number: '' }), 0, null)).toBe('INCOMPLETE');`,
    `    expect(companionOtpState(entry({ phone_number: '' }), 0, null, false)).toBe('INCOMPLETE');`);

// Any remaining three-argument call in the file.
s = s.replace(/companionOtpState\((entry\([^)]*\)), (\d+), (null|\d+)\)/g, (m, e, i, a) =>
  `companionOtpState(${e}, ${i}, ${a}, false)`);

const ADDED = `
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

  // A row nobody has filled in yet is not a duplicate of the other empty rows.
  it('says nothing about rows with no number typed yet', () => {
    const rows = [entry({ phone_number: '' }), entry({ phone_number: '  ' })];
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
`;

s = s.replace(/\n+$/, '') + '\n' + ADDED;
fs.writeFileSync(P, crlf ? s.split('\n').join('\r\n') : s);
console.log('patched', P);
