/**
 * "Pods held in the period" and what happened at them: the shared reads every
 * club / host / club-admin dashboard is computed from. Models are mocked; the
 * mapping, the defaults for legacy rows, and the summing are real.
 */
jest.mock('@modules/pods/pod/pod.model', () => ({ PodModel: { find: jest.fn(), distinct: jest.fn() } }));
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { aggregate: jest.fn() } }));
jest.mock('@modules/pods/ticket/ticket.model', () => ({ TicketModel: { aggregate: jest.fn() } }));
jest.mock('@modules/support/bouncer/bouncer.model', () => ({ BouncerFeedbackModel: { aggregate: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { find: jest.fn() } }));
jest.mock('@modules/platform/location/location.model', () => ({ LocationModel: { find: jest.fn() } }));
jest.mock('@modules/pods/category/category.model', () => ({ CategoryModel: { find: jest.fn() } }));

import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { BouncerFeedbackModel } from '@modules/support/bouncer/bouncer.model';
import { UserModel } from '@modules/access/user/user.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import {
  groupPods,
  loadHeldPods,
  loadOutcomes,
  rankingValues,
  sumPods,
  type HeldPod,
} from '../../entity/held-pods';
import { categoryNames, locationNames, refKey, userNames } from '../../entity/lookups';
import { cityLocation, cityScope, NO_CITY } from '../../entity/city';

const m = (fn: unknown) => fn as jest.Mock;
const oid = () => new Types.ObjectId();
/** A mongoose query that is awaited after any chain of `select`/`lean`. */
const query = <T>(value: T) => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    lean: () => Promise.resolve(value),
    setOptions: () => Promise.resolve(value),
  };
  return chain;
};

beforeEach(() => jest.clearAllMocks());

describe('loadHeldPods', () => {
  it('reads every city when no location filter is given', async () => {
    m(PodModel.find).mockReturnValue(query([]));
    expect(await loadHeldPods(new Date('2026-03-01'), new Date('2026-03-31'))).toEqual([]);
    expect(Object.keys(m(PodModel.find).mock.calls[0][0])).toEqual(['pod_date_time']);
  });

  it('maps a full pod and applies the legacy defaults to a bare one', async () => {
    const club = oid();
    const host = oid();
    const loc = oid();
    const when = new Date('2026-03-10T10:00:00Z');
    m(PodModel.find).mockReturnValue(
      query([
        {
          _id: oid(),
          club_id: club,
          pod_hosts_id: [host],
          location_id: loc,
          pod_date_time: when,
          no_of_spots: 10,
          pod_attendees: [{}, {}, {}],
          extra_seats: 2,
          pod_amount: 150,
          pod_mode: 'VIRTUAL',
          pod_type: 'FREE',
        },
        { _id: oid(), club_id: club, pod_date_time: when },
      ])
    );
    const out = await loadHeldPods(new Date('2026-03-01'), new Date('2026-03-31'), { location_id: loc });
    expect(m(PodModel.find).mock.calls[0][0]).toMatchObject({ location_id: loc });
    expect(out[0]).toMatchObject({
      club_id: club.toHexString(),
      host_ids: [host.toHexString()],
      location_id: loc.toHexString(),
      spots: 10,
      seats: 5,
      amount: 150,
      mode: 'VIRTUAL',
      type: 'FREE',
    });
    expect(out[1]).toMatchObject({
      host_ids: [],
      location_id: null,
      spots: 0,
      seats: 0,
      amount: 0,
      mode: 'PHYSICAL',
      type: 'PAID',
    });
  });
});

describe('loadOutcomes', () => {
  const pod = (id: Types.ObjectId): HeldPod => ({
    id: id.toHexString(),
    club_id: 'c',
    host_ids: [],
    location_id: null,
    starts_at: new Date(),
    spots: 10,
    seats: 4,
    amount: 0,
    mode: 'PHYSICAL',
    type: 'PAID',
  });

  it('reads nothing for no pods', async () => {
    const out = await loadOutcomes([]);
    expect(out.size).toBe(0);
    expect(PaymentModel.aggregate).not.toHaveBeenCalled();
  });

  it('folds payments, door scans and ratings onto each pod and ignores rows for unknown pods', async () => {
    const a = oid();
    const b = oid();
    m(PaymentModel.aggregate).mockResolvedValue([{ _id: a, revenue: 900 }, { _id: oid(), revenue: 5 }]);
    m(TicketModel.aggregate).mockResolvedValue([
      { _id: a, admitted: 8, checked_in: 6, forced: 1, host_scans: 4, host_manual: 1 },
    ]);
    m(BouncerFeedbackModel.aggregate).mockResolvedValue([
      { _id: b, rating_sum: 9, rating_count: 2, host_rating_sum: 'junk', unknown_field: 7 },
    ]);
    const out = await loadOutcomes([pod(a), pod(b)]);
    expect(out.get(a.toHexString())).toMatchObject({
      revenue: 900,
      admitted: 8,
      checked_in: 6,
      forced: 1,
      host_scans: 4,
      host_manual: 1,
    });
    expect(out.get(b.toHexString())).toMatchObject({ rating_sum: 9, rating_count: 2, host_rating_sum: 0, revenue: 0 });
    expect(out.get(b.toHexString())).not.toHaveProperty('unknown_field');
  });
});

describe('sumPods / rankingValues / groupPods', () => {
  const p = (id: string, seats: number, spots: number, hosts: string[] = []): HeldPod => ({
    id,
    club_id: 'c',
    host_ids: hosts,
    location_id: null,
    starts_at: new Date(),
    spots,
    seats,
    amount: 0,
    mode: 'PHYSICAL',
    type: 'PAID',
  });

  it('adds pods, seats, spots and outcomes, skipping pods with no outcome row', () => {
    const outcomes = new Map([
      ['p1', { revenue: 100, admitted: 4, checked_in: 3 } as never],
      ['p2', { revenue: 50, admitted: 6, checked_in: 3 } as never],
    ]);
    const totals = sumPods([p('p1', 4, 10), p('p2', 6, 10), p('p3', 1, 5)], outcomes);
    expect(totals).toMatchObject({ pods: 3, seats: 11, spots: 25, revenue: 150, admitted: 10, checked_in: 6 });
  });

  it('ranks with fill rate, rounded revenue, attendance and a null rating when unrated', () => {
    const totals = { ...sumPods([p('p1', 5, 10)], new Map()), revenue: 99.6, admitted: 4, checked_in: 3 };
    expect(rankingValues(totals, { sum: 0, count: 0 })).toEqual([1, 5, 50, 100, 75, null]);
    expect(rankingValues(totals, { sum: 9, count: 2 })[5]).toBe(4.5);
  });

  it('counts a pod under every key it names', () => {
    const groups = groupPods([p('p1', 1, 1, ['h1', 'h2']), p('p2', 1, 1, ['h1'])], (pod) => pod.host_ids);
    expect(groups.get('h1')?.map((x) => x.id)).toEqual(['p1', 'p2']);
    expect(groups.get('h2')?.map((x) => x.id)).toEqual(['p1']);
  });
});

describe('name lookups', () => {
  it('names users by full name, else email, else empty — and skips invalid ids', async () => {
    const a = oid();
    const b = oid();
    const c = oid();
    m(UserModel.find).mockReturnValue(
      query([
        { _id: a, profile: { first_name: 'Asha', last_name: 'Rao' }, email: 'a@example.com' },
        { _id: b, email: 'b@example.com' },
        { _id: c },
      ])
    );
    const out = await userNames([a.toHexString(), a.toHexString(), 'garbage']);
    expect(m(UserModel.find).mock.calls[0][0]._id.$in).toHaveLength(1);
    expect(out.get(a.toHexString())).toBe('Asha Rao');
    expect(out.get(b.toHexString())).toBe('b@example.com');
    expect(out.get(c.toHexString())).toBe('');
  });

  it('names locations and categories', async () => {
    const id = oid();
    m(LocationModel.find).mockReturnValue(query([{ _id: id, location_name: 'Pune' }]));
    m(CategoryModel.find).mockReturnValue(query([{ _id: id, name: 'Dining' }]));
    expect((await locationNames([id.toHexString()])).get(id.toHexString())).toBe('Pune');
    expect((await categoryNames([id.toHexString()])).get(id.toHexString())).toBe('Dining');
  });

  it('files every missing ref under one bucket', () => {
    const id = oid();
    expect(refKey(null)).toBe('none');
    expect(refKey(undefined)).toBe('none');
    expect(refKey('abc')).toBe('abc');
    expect(refKey(id)).toBe(id.toHexString());
  });
});

describe('city scope', () => {
  it('is empty with no city', async () => {
    expect(cityLocation(null)).toEqual({});
    expect(await cityScope(null)).toBe(NO_CITY);
  });

  it('narrows pods by location and bookings by the ids of that city pods, cancelled included', async () => {
    const city = oid();
    const podIds = [oid(), oid()];
    m(PodModel.distinct).mockReturnValue(query(podIds));
    const scope = await cityScope(city.toHexString());
    expect(m(PodModel.distinct).mock.calls[0]).toEqual(['_id', { location_id: city }]);
    expect(scope.location).toEqual({ location_id: city });
    expect(scope.pods).toEqual({ pod_id: { $in: podIds } });
    expect(cityLocation(city.toHexString())).toEqual({ location_id: city });
  });
});
