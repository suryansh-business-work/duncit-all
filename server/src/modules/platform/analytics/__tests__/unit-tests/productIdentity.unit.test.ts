jest.mock('@utils/app-time', () => ({ getAppTimeZone: () => 'Asia/Kolkata' }));

import { actorDays, actorOf, isVisitor, ownersFromTuples, visitorKey } from '../../product/product.identity';
import { keyedTotals } from '../../product/product.counts';

describe('product identity stitching', () => {
  const tuples = [
    // Browsed signed out on day 1, signed in on day 2: one person, not two.
    { user: null, device: 'phone-1', day: '2026-10-01' },
    { user: 'm1', device: 'phone-1', day: '2026-10-02' },
    // Never signed in anywhere: a visitor of their own.
    { user: null, device: 'tablet-9', day: '2026-10-02' },
    // Signed in on a second device too.
    { user: 'm1', device: 'laptop-2', day: '2026-10-03' },
  ];

  it('owns a device by the member signed in on it', () => {
    expect(ownersFromTuples(tuples)).toEqual(
      new Map([
        ['phone-1', 'm1'],
        ['laptop-2', 'm1'],
      ])
    );
  });

  it('names a signed-out event by the device owner, or as a visitor when nobody signed in on it', () => {
    const owners = ownersFromTuples(tuples);
    expect(actorOf(null, 'phone-1', owners)).toBe('m1');
    expect(actorOf(null, 'tablet-9', owners)).toBe(visitorKey('tablet-9'));
    expect(actorOf('m2', 'phone-1', owners)).toBe('m2');
    expect(isVisitor(visitorKey('x'))).toBe(true);
    expect(isVisitor('m1')).toBe(false);
  });

  it('gathers each person’s active days across devices and the signed-out part', () => {
    const days = actorDays(tuples, ownersFromTuples(tuples));
    expect(days).toEqual(
      new Map([
        ['m1', new Set(['2026-10-01', '2026-10-02', '2026-10-03'])],
        ['d:tablet-9', new Set(['2026-10-02'])],
      ])
    );
  });

  it('counts unique people per key apart from the total — clicks are not users', () => {
    const rows = [
      { key: 'Join', user: 'm1', device: 'phone-1', count: 3 },
      { key: 'Join', user: null, device: 'phone-1', count: 2 },
      { key: 'Join', user: null, device: 'tablet-9', count: 1 },
      { key: 'Share', user: 'm1', device: 'laptop-2', count: 1 },
    ];
    const totals = keyedTotals(rows, ownersFromTuples(tuples));
    expect(totals.get('Join')).toEqual({ count: 6, actors: 2 });
    expect(totals.get('Share')).toEqual({ count: 1, actors: 1 });
  });
});
