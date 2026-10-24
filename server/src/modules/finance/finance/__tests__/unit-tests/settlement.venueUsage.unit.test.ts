/**
 * What completion tells settlement about the venue: the people who came (from
 * the roster, the hosts' own seats included) and the extra charges on the bill.
 */
import { peopleWhoCame, venueUsageOf } from '../../settlement.service';

const row = (user_id: string, attended: boolean, seats = 1) => ({
  membership_id: `m-${user_id}`,
  user_id,
  name: user_id,
  seats,
  attended,
  attended_at: null,
  amount: 0,
});

describe('peopleWhoCame', () => {
  it('counts every seat scanned in plus the hosts, who scan nobody for their own seat', () => {
    const roster = { attended_seats: 5, rows: [row('guest-1', true, 3), row('guest-2', true, 2), row('guest-3', false)] };
    expect(peopleWhoCame(['host-1'], roster)).toBe(6);
    expect(peopleWhoCame(['host-1', 'host-2'], roster)).toBe(7);
  });

  it('never counts a host twice — a host holding a scanned booking is already among the seats', () => {
    const roster = { attended_seats: 3, rows: [row('host-1', true, 1), row('guest-1', true, 2)] };
    expect(peopleWhoCame(['host-1'], roster)).toBe(3);
  });

  it('counts a host whose booking was not scanned', () => {
    const roster = { attended_seats: 2, rows: [row('host-1', false), row('guest-1', true, 2)] };
    expect(peopleWhoCame(['host-1'], roster)).toBe(3);
  });

  it('reads a pod with no hosts listed as the scanned seats alone', () => {
    expect(peopleWhoCame(null, { attended_seats: 4, rows: [] })).toBe(4);
    expect(peopleWhoCame(undefined, { attended_seats: 0, rows: [] })).toBe(0);
  });
});

describe('venueUsageOf — extra charges on the bill', () => {
  it('takes an amount from 0 up, rounded to the paisa', () => {
    expect(venueUsageOf({ venue_extra_amount: 0 })).toEqual({ extra: 0 });
    expect(venueUsageOf({ venue_extra_amount: 349.999 })).toEqual({ extra: 350 });
    expect(venueUsageOf({ venue_extra_amount: 1_000_000 })).toEqual({ extra: 1_000_000 });
  });

  it('leaves it out when nothing was sent', () => {
    expect(venueUsageOf({})).toEqual({});
    expect(venueUsageOf({ venue_extra_amount: null })).toEqual({});
  });

  it('refuses a negative, unbounded or non-numeric amount', () => {
    for (const bad of [-1, 1_000_000.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => venueUsageOf({ venue_extra_amount: bad })).toThrow('Enter the extra charges as an amount from 0 to 1000000');
    }
  });

  it('reads the extra charges beside the head count and overtime', () => {
    expect(venueUsageOf({ venue_pax: 9, overtime_hours: 1.1, venue_extra_amount: 120 })).toEqual({ pax: 9, overtimeHours: 1, extra: 120 });
  });
});
