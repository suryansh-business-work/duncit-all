import { describe, expect, it } from 'vitest';
import {
  OTP_MEDIUMS,
  attendanceProgress,
  attendanceRowState,
  canScanTickets,
  hasUnmarked,
  isOtpCodeShape,
  isOtpExtensionShape,
  isOtpPhoneShape,
  joinPhone,
  needsOtp,
  splitAttendance,
  type PodAttendanceRow,
} from '../src/pod-attendance';

/** A roster row, with only the fields under test set deliberately. */
const row = (over: Partial<PodAttendanceRow> = {}): PodAttendanceRow => ({
  membership_id: 'm1',
  user_id: 'u1',
  ticket_id: 't1',
  ticket_code: 'DUN-1',
  name: 'Asha',
  avatar_url: '',
  email: 'asha@example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  seats: 1,
  attended: false,
  attended_at: null,
  marked_method: null,
  marked_by_name: '',
  verified_phone: '',
  companions: [],
  companions_required: 0,
  ...over,
});

describe('OTP_MEDIUMS', () => {
  it('lists WhatsApp before SMS, the order the pickers render', () => {
    expect(OTP_MEDIUMS).toEqual(['WHATSAPP', 'SMS']);
  });
});

describe('attendanceRowState', () => {
  it('reports an already-present row as MARKED even when marking is closed', () => {
    expect(attendanceRowState(row({ attended: true }), false)).toBe('MARKED');
  });

  it('lets MARKED win over an outstanding companion list', () => {
    // The two surfaces used to disagree here: a multi-seat booking that was
    // ALSO already marked must read MARKED, not NEEDS_COMPANIONS.
    expect(attendanceRowState({ attended: true, companions_required: 2 }, true)).toBe('MARKED');
  });

  it('locks an unmarked row when the roster cannot be marked', () => {
    expect(attendanceRowState(row(), false)).toBe('LOCKED');
  });

  it('blocks a multi-seat booking until the rest of the group is named', () => {
    expect(attendanceRowState(row({ companions_required: 1 }), true)).toBe('NEEDS_COMPANIONS');
  });

  it('is READY for a single-seat booking on an open roster', () => {
    expect(attendanceRowState(row(), true)).toBe('READY');
  });

  it('does not make a Club Admin wait for names collected at a door', () => {
    // Naming the group is the HOST's door step, and the server's club-admin
    // mark has never had that gate — applying it here disabled the only button
    // an admin has, on exactly the bookings they are called about.
    const group = row({ seats: 8, companions_required: 7 });
    expect(attendanceRowState(group, true, 'HOST')).toBe('NEEDS_COMPANIONS');
    expect(attendanceRowState(group, true, 'CLUB_ADMIN')).toBe('READY');
  });
});

describe('splitAttendance', () => {
  it('partitions the roster into marked and unmarked', () => {
    const a = row({ membership_id: 'a', attended: true });
    const b = row({ membership_id: 'b' });
    const c = row({ membership_id: 'c', attended: true });
    const { marked, unmarked } = splitAttendance([a, b, c]);
    expect(marked.map((r) => r.membership_id)).toEqual(['a', 'c']);
    expect(unmarked.map((r) => r.membership_id)).toEqual(['b']);
  });

  it('keeps the incoming order within each group', () => {
    const rows = ['x', 'y', 'z'].map((id) => row({ membership_id: id }));
    expect(splitAttendance(rows).unmarked.map((r) => r.membership_id)).toEqual(['x', 'y', 'z']);
  });

  it('returns two empty lists for an empty roster', () => {
    expect(splitAttendance([])).toEqual({ marked: [], unmarked: [] });
  });
});

describe('attendanceProgress', () => {
  it('reports the percentage of seats marked', () => {
    expect(attendanceProgress({ marked_seats: 5, total_seats: 10 })).toBe(50);
  });

  it('rounds to the nearest whole percent', () => {
    expect(attendanceProgress({ marked_seats: 1, total_seats: 3 })).toBe(33);
    expect(attendanceProgress({ marked_seats: 2, total_seats: 3 })).toBe(67);
  });

  it('answers 0 rather than NaN when nobody booked', () => {
    expect(attendanceProgress({ marked_seats: 0, total_seats: 0 })).toBe(0);
    expect(attendanceProgress({ marked_seats: 3, total_seats: -1 })).toBe(0);
  });

  it('never exceeds 100 even if more seats were marked than sold', () => {
    expect(attendanceProgress({ marked_seats: 12, total_seats: 10 })).toBe(100);
  });
});

describe('hasUnmarked', () => {
  it('is true while anybody on the roster is unmarked', () => {
    expect(hasUnmarked({ marked_count: 3, total_count: 4 })).toBe(true);
  });

  it('is false once every booking carries a mark', () => {
    expect(hasUnmarked({ marked_count: 4, total_count: 4 })).toBe(false);
  });

  it('is false for an empty roster', () => {
    expect(hasUnmarked({ marked_count: 0, total_count: 0 })).toBe(false);
  });
});

describe('needsOtp', () => {
  it('asks the host for a code when the admin setting requires one', () => {
    expect(needsOtp({ viewer: 'HOST', otp_required: true })).toBe(true);
  });

  it('does not ask the host when the setting is off', () => {
    expect(needsOtp({ viewer: 'HOST', otp_required: false })).toBe(false);
  });

  it('never asks the Club Admin, whose override exists for the unreachable attendee', () => {
    // Asking the override to reach someone it exists BECAUSE you cannot reach
    // would be circular; the server enforces the same rule.
    expect(needsOtp({ viewer: 'CLUB_ADMIN', otp_required: true })).toBe(false);
  });
});

describe('isOtpCodeShape', () => {
  it('accepts exactly six digits, ignoring surrounding space', () => {
    expect(isOtpCodeShape('123456')).toBe(true);
    expect(isOtpCodeShape('  123456  ')).toBe(true);
  });

  it('rejects anything that is not six digits', () => {
    expect(isOtpCodeShape('12345')).toBe(false);
    expect(isOtpCodeShape('1234567')).toBe(false);
    expect(isOtpCodeShape('12345a')).toBe(false);
    expect(isOtpCodeShape('')).toBe(false);
  });
});

describe('isOtpPhoneShape', () => {
  it('accepts 6 to 15 digits at the boundaries', () => {
    expect(isOtpPhoneShape('123456')).toBe(true);
    expect(isOtpPhoneShape('123456789012345')).toBe(true);
  });

  it('rejects a number outside that range or carrying punctuation', () => {
    expect(isOtpPhoneShape('12345')).toBe(false);
    expect(isOtpPhoneShape('1234567890123456')).toBe(false);
    expect(isOtpPhoneShape('98765 43210')).toBe(false);
  });
});

describe('isOtpExtensionShape', () => {
  it('accepts a dial code with or without its plus', () => {
    expect(isOtpExtensionShape('+91')).toBe(true);
    expect(isOtpExtensionShape('91')).toBe(true);
    expect(isOtpExtensionShape('1')).toBe(true);
    expect(isOtpExtensionShape('+12345')).toBe(true);
  });

  it('rejects an empty, over-long or non-numeric dial code', () => {
    expect(isOtpExtensionShape('')).toBe(false);
    expect(isOtpExtensionShape('+123456')).toBe(false);
    expect(isOtpExtensionShape('++91')).toBe(false);
  });
});

describe('joinPhone', () => {
  it('joins the dial code and the number with a single space', () => {
    expect(joinPhone('+91', '9876543210')).toBe('+91 9876543210');
  });

  it('returns the bare number when there is no dial code', () => {
    expect(joinPhone('', '9876543210')).toBe('9876543210');
    expect(joinPhone('   ', '9876543210')).toBe('9876543210');
  });

  it('returns nothing at all when there is no number to show', () => {
    expect(joinPhone('+91', '')).toBe('');
    expect(joinPhone('+91', '   ')).toBe('');
  });

  it('survives a null extension or number from the API', () => {
    expect(joinPhone(null as unknown as string, '9876543210')).toBe('9876543210');
    expect(joinPhone('+91', null as unknown as string)).toBe('');
  });
});

describe('canScanTickets', () => {
  // A virtual pod's attendance is recorded when a member opens the meeting
  // link, so offering the scanner there points at a door that does not exist.
  it('offers the scanner to a host running a physical pod', () => {
    expect(canScanTickets({ viewer: 'HOST', can_mark: true, pod_mode: 'PHYSICAL' })).toBe(true);
  });

  it('hides it on a virtual pod, where there is nothing to scan at', () => {
    expect(canScanTickets({ viewer: 'HOST', can_mark: true, pod_mode: 'VIRTUAL' })).toBe(false);
  });

  it('hides it from a Club Admin, whose way in is the override', () => {
    expect(canScanTickets({ viewer: 'CLUB_ADMIN', can_mark: true, pod_mode: 'PHYSICAL' })).toBe(false);
  });

  it('hides it once the board is locked and nothing can be marked', () => {
    expect(canScanTickets({ viewer: 'HOST', can_mark: false, pod_mode: 'PHYSICAL' })).toBe(false);
  });
});
