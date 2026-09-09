import { describe, expect, it } from 'vitest';
import {
  CONTACT_KEY_MIN_DIGITS,
  RADAR_MAX_ITEMS,
  RADAR_RING_CAPACITY,
  RADAR_RINGS,
  contactEntriesFromPhoneBook,
  invitableName,
  inviteOutcomeKey,
  isInvited,
  pendingInviteKeys,
  radarPositions,
  toggleInviteKey,
} from '../src/contact-radar';

describe('contactEntriesFromPhoneBook', () => {
  it('keys every number the way the server compares it and drops the phone book', () => {
    const entries = contactEntriesFromPhoneBook([
      { name: 'Riya Sharma', phones: ['+91 98765 43210', '098765 43210'] },
      { name: 'Aman', phones: ['9123456789'] },
    ]);
    expect(entries).toEqual([
      { phone_key: '9876543210', label: 'Riya Sharma' },
      { phone_key: '9123456789', label: 'Aman' },
    ]);
  });

  it('keeps the first name seen for a number, unless that name was blank', () => {
    const entries = contactEntriesFromPhoneBook([
      { name: '', phones: ['9876543210'] },
      { name: 'Riya', phones: ['9876543210'] },
      { name: 'Riya Again', phones: ['9876543210'] },
      { name: null, phones: [null, undefined] },
    ]);
    expect(entries).toEqual([{ phone_key: '9876543210', label: 'Riya' }]);
  });

  it('ignores short codes and typos shorter than the minimum', () => {
    const short = '1'.repeat(CONTACT_KEY_MIN_DIGITS - 1);
    expect(contactEntriesFromPhoneBook([{ name: 'Bank', phones: [short, '12345'] }])).toEqual([]);
  });
});

describe('radarPositions', () => {
  it('seats nearby people on the inner ring and everyone else further out', () => {
    const points = radarPositions([
      { id: 'far', nearby: false },
      { id: 'near', nearby: true },
    ]);
    expect(points.get('near')?.ring).toBe(0);
    expect(points.get('far')?.ring).toBe(0);
    // Both sit on the innermost ring's radius, as fractions of the width.
    const near = points.get('near')!;
    const distance = Math.hypot(near.x - 0.5, near.y - 0.5);
    expect(distance).toBeCloseTo(RADAR_RINGS[0] / 2, 6);
  });

  it('spills onto the next ring once a ring is full, and stops plotting past the last', () => {
    const items = Array.from({ length: RADAR_MAX_ITEMS + 3 }, (_, index) => ({
      id: `u${index}`,
      nearby: index % 2 === 0,
    }));
    const points = radarPositions(items);
    expect(points.size).toBe(RADAR_MAX_ITEMS);
    const rings = new Set([...points.values()].map((point) => point.ring));
    expect(rings).toEqual(new Set(RADAR_RING_CAPACITY.map((_, ring) => ring)));
    // Nearby people are seated first, so the ones left standing are the last
    // of the far-away ones — the final even id is nearby and still plotted.
    expect(points.has(`u${RADAR_MAX_ITEMS + 2}`)).toBe(true);
    expect(points.has(`u${RADAR_MAX_ITEMS + 1}`)).toBe(false);
  });

  it('returns nothing for nobody', () => {
    expect(radarPositions([]).size).toBe(0);
  });
});

describe('the invite list', () => {
  const waiting = { phone_key: '9876543210', contact_label: 'Ritu Malhotra', invited_at: null };
  const asked = {
    phone_key: '9876543211',
    contact_label: 'Karan Bhatia',
    invited_at: '2026-09-01T10:00:00Z',
  };

  it('knows who has already been texted', () => {
    expect(isInvited(waiting)).toBe(false);
    expect(isInvited(asked)).toBe(true);
    // The field is optional on the type — a row that never carried it is waiting.
    expect(isInvited({ phone_key: '9876543212', contact_label: 'Dev' })).toBe(false);
  });

  it('falls back to the number when the phone book saved no name', () => {
    expect(invitableName(waiting)).toBe('Ritu Malhotra');
    expect(invitableName({ phone_key: '9876543212', contact_label: '   ' })).toBe('9876543212');
  });

  it('sends only the ones still waiting when Invite all is pressed', () => {
    expect(pendingInviteKeys([waiting, asked])).toEqual(['9876543210']);
    expect(pendingInviteKeys([asked])).toEqual([]);
  });

  it('ticks a key in and out as a NEW array', () => {
    const empty: string[] = [];
    const one = toggleInviteKey(empty, '9876543210');
    expect(one).toEqual(['9876543210']);
    expect(one).not.toBe(empty);
    expect(toggleInviteKey(one, '9876543211')).toEqual(['9876543210', '9876543211']);
    expect(toggleInviteKey(one, '9876543210')).toEqual([]);
  });

  it('names the sentence a press earned, and never confuses held-back with failed', () => {
    expect(inviteOutcomeKey({ sent: 2, failed: 0 })).toBe('mweb.contacts.invitesSent');
    expect(inviteOutcomeKey({ sent: 0, failed: 3 })).toBe('mweb.contacts.invitesFailed');
    expect(inviteOutcomeKey({ sent: 0, failed: 0 })).toBe('mweb.contacts.invitesSkipped');
    // One that went and one that did not is still a send, not a failure.
    expect(inviteOutcomeKey({ sent: 1, failed: 1 })).toBe('mweb.contacts.invitesSent');
  });
});
