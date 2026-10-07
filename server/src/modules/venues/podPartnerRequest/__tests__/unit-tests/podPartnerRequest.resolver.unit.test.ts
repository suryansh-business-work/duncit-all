/**
 * The Pod Request resolvers are thin: each one authenticates the caller and
 * hands the caller's own id plus the GraphQL args to the service or search —
 * never an id from the client in the caller's place.
 */
jest.mock('../../podPartnerRequest.service', () => ({
  podPartnerRequestService: {
    send: jest.fn(),
    respond: jest.fn(),
    cancel: jest.fn(),
    requestSlot: jest.fn(),
    respondSlot: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    quota: jest.fn(),
  },
}));
jest.mock('../../podPartnerRequest.search', () => ({
  podPartnerSearch: { nearbyHosts: jest.fn(), nearbyVenues: jest.fn() },
}));

import { podPartnerRequestResolvers } from '../../podPartnerRequest.resolver';
import { podPartnerRequestService } from '../../podPartnerRequest.service';
import { podPartnerSearch } from '../../podPartnerRequest.search';
import { makeContext } from '@test/harness';

type Resolver = (p: unknown, a: any, c: any) => Promise<unknown>;
const Query = podPartnerRequestResolvers.Query as unknown as Record<string, Resolver>;
const Mutation = podPartnerRequestResolvers.Mutation as unknown as Record<string, Resolver>;
const svc = podPartnerRequestService as unknown as Record<string, jest.Mock>;
const search = podPartnerSearch as unknown as Record<string, jest.Mock>;

const CALLER = '507f1f77bcf86cd799439011';
const caller = () => makeContext({ id: CALLER, roles: ['USER'] });
const anon = () => makeContext(null);
const searchArgs = { location_id: '507f1f77bcf86cd799439012', zone_name: 'Bandra', radius_km: 3, category_ids: ['c1'] };

const cases: [string, Resolver, Record<string, unknown>, jest.Mock, unknown[]][] = [
  ['nearbyHostsForVenue', Query.nearbyHostsForVenue, { venue_id: 'v1', search: searchArgs }, search.nearbyHosts, [CALLER, 'v1', searchArgs]],
  ['nearbyVenuesForHost', Query.nearbyVenuesForHost, { search: searchArgs }, search.nearbyVenues, [CALLER, searchArgs]],
  [
    'myPodPartnerRequests',
    Query.myPodPartnerRequests,
    { side: 'VENUE', direction: 'HOST_TO_VENUE', venue_id: 'v1' },
    svc.list,
    [CALLER, 'VENUE', 'HOST_TO_VENUE', 'v1'],
  ],
  ['podPartnerRequest', Query.podPartnerRequest, { id: 'r1' }, svc.get, [CALLER, 'r1']],
  ['podPartnerRequestQuota', Query.podPartnerRequestQuota, { side: 'HOST', venue_id: null }, svc.quota, [CALLER, 'HOST', null]],
  [
    'sendPodPartnerRequest',
    Mutation.sendPodPartnerRequest,
    { input: { direction: 'HOST_TO_VENUE', venue_id: 'v1', note: 'hi' } },
    svc.send,
    [CALLER, { direction: 'HOST_TO_VENUE', venue_id: 'v1', note: 'hi' }],
  ],
  ['respondPodPartnerRequest', Mutation.respondPodPartnerRequest, { id: 'r1', accept: false }, svc.respond, [CALLER, 'r1', false]],
  ['cancelPodPartnerRequest', Mutation.cancelPodPartnerRequest, { id: 'r1' }, svc.cancel, [CALLER, 'r1']],
  ['requestPodPartnerSlot', Mutation.requestPodPartnerSlot, { id: 'r1', slot_id: 's1' }, svc.requestSlot, [CALLER, 'r1', 's1']],
  ['respondPodPartnerSlot', Mutation.respondPodPartnerSlot, { id: 'r1', confirm: true }, svc.respondSlot, [CALLER, 'r1', true]],
];

describe('podPartnerRequestResolvers', () => {
  it.each(cases)('%s passes the caller id and the args through and returns the result', async (_name, resolver, args, target, expected) => {
    const result = { ok: _name };
    target.mockResolvedValue(result);
    await expect(resolver(null, args, caller())).resolves.toBe(result);
    expect(target).toHaveBeenCalledTimes(1);
    expect(target).toHaveBeenCalledWith(...expected);
  });

  it.each(cases)('%s refuses an anonymous caller before reaching the service', (_name, resolver, args, target) => {
    expect(() => resolver(null, args, anon())).toThrow(
      expect.objectContaining({ extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }) })
    );
    expect(target).not.toHaveBeenCalled();
  });
});
