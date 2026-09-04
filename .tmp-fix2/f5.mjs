import fs from 'node:fs';
const P = 'packages/utils/__tests__/pod-attendance.test.ts';
const raw = fs.readFileSync(P, 'utf8');
const crlf = raw.includes('\r\n');
let s = crlf ? raw.split('\r\n').join('\n') : raw;
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0,50)); s = s.replace(a, () => b); };

rep(`  splitAttendance,
  type PodAttendanceRow,
} from '../src/pod-attendance';`,
`  showsCompleteDeadline,
  splitAttendance,
  type PodAttendanceRow,
} from '../src/pod-attendance';`);

s = s.replace(/\n+$/, '') + `

describe('showsCompleteDeadline', () => {
  const board = {
    viewer: 'HOST' as const,
    lock: 'OPEN' as const,
    complete_deadline: '2026-09-10T18:30:00.000Z' as string | null,
  };

  // The warning is a call to act, and only the host can act: they are the one
  // who marks the roster and whose payout the unmarked seats come out of.
  it('warns the host while the roster is still open and a deadline is set', () => {
    expect(showsCompleteDeadline(board)).toBe(true);
  });

  it('says nothing to a club admin, who is not the one being asked', () => {
    expect(showsCompleteDeadline({ ...board, viewer: 'CLUB_ADMIN' })).toBe(false);
  });

  // Past the lock there is nothing left to do in time — the banner explaining
  // WHY it is shut has taken over by then.
  it('says nothing once the roster is shut, however it was shut', () => {
    for (const lock of ['COMPLETED', 'CANCELLED', 'EXPIRED'] as const) {
      expect(showsCompleteDeadline({ ...board, lock })).toBe(false);
    }
  });

  it('says nothing when there is no deadline to count down to', () => {
    expect(showsCompleteDeadline({ ...board, complete_deadline: null })).toBe(false);
    expect(showsCompleteDeadline({ ...board, complete_deadline: '' })).toBe(false);
  });
});
`;
fs.writeFileSync(P, crlf ? s.split('\n').join('\r\n') : s);
console.log('patched', P);
