/**
 * The offer API's moves reach the service with the round the client read —
 * each resolver called directly, as the authenticated host or venue owner.
 */
jest.mock('../../venueOffer.service', () => ({
  venueOfferService: {
    preview: jest.fn().mockResolvedValue('preview'),
    counterPreview: jest.fn().mockResolvedValue('counterPreview'),
    hostCounterPreview: jest.fn().mockResolvedValue('hostCounterPreview'),
    forPod: jest.fn().mockResolvedValue('forPod'),
    counter: jest.fn().mockResolvedValue('counter'),
    hostAccept: jest.fn().mockResolvedValue('hostAccept'),
    hostReject: jest.fn().mockResolvedValue(true),
    hostCounter: jest.fn().mockResolvedValue('hostCounter'),
  },
}));
jest.mock('@modules/venues/venueSlot/venueSlot.service', () => ({
  venueSlotService: { approveRequest: jest.fn().mockResolvedValue('approved'), declineRequest: jest.fn().mockResolvedValue('declined') },
}));
jest.mock('../../venueOffer.revise', () => ({
  venueOfferReviseService: {
    editPreview: jest.fn().mockResolvedValue('editPreview'),
    editCounter: jest.fn().mockResolvedValue('editCounter'),
    withdrawCounter: jest.fn().mockResolvedValue('withdrawCounter'),
  },
}));

import { makeContext } from '@test/harness';
import { venueOfferResolvers } from '../../venueOffer.resolver';
import { venueSlotResolvers } from '../../../venueSlot/venueSlot.resolver';
import { venueOfferService } from '../../venueOffer.service';
import { venueOfferReviseService } from '../../venueOffer.revise';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { settingsService } from '@modules/platform/settings/settings.service';

const ctx = makeContext({ id: 'user-1' });
const terms = { model: 'PER_GUEST', rate: 600, min_guests: 8, offerings: ['Projector'] };
type Resolver = (p: unknown, a: unknown, c: unknown) => unknown;
const query = (name: string) => (venueOfferResolvers.Query as Record<string, Resolver>)[name];
const mutation = (name: string) => (venueOfferResolvers.Mutation as Record<string, Resolver>)[name];

describe('venue offer resolvers', () => {
  it("price Create Pod's offer from the venue's own minimum, as the offer it sends will be", async () => {
    const offer = { start_at: 's', end_at: 'e', pax: 20, model: 'PER_GUEST', rate: 500 };
    await expect(query('venueOfferQuote')({}, { venue_id: 'venue-1', offer }, ctx)).resolves.toBe('preview');
    expect(venueOfferService.preview).toHaveBeenCalledWith('venue-1', offer, undefined, true);
  });

  it('price a host’s counter-back for its pod', async () => {
    await expect(query('hostCounterQuote')({}, { pod_id: 'pod-1', terms }, ctx)).resolves.toBe('hostCounterPreview');
    expect(venueOfferService.hostCounterPreview).toHaveBeenCalledWith('user-1', 'pod-1', terms);
  });

  it('send each move with the round that was read', async () => {
    await mutation('counterVenueOffer')({}, { slot_id: 'slot-1', terms, note: 'Veg only', round: 1 }, ctx);
    expect(venueOfferService.counter).toHaveBeenCalledWith('user-1', 'slot-1', terms, 'Veg only', 1);
    await mutation('counterVenueOfferAsHost')({}, { pod_id: 'pod-1', terms, note: 'Halfway?', round: 2 }, ctx);
    expect(venueOfferService.hostCounter).toHaveBeenCalledWith('user-1', 'pod-1', terms, 'Halfway?', 2);
    await mutation('acceptVenueCounterOffer')({}, { pod_id: 'pod-1', round: 3 }, ctx);
    expect(venueOfferService.hostAccept).toHaveBeenCalledWith('user-1', 'pod-1', 3);
    await mutation('rejectVenueCounterOffer')({}, { pod_id: 'pod-1', reason: 'No', round: 3 }, ctx);
    expect(venueOfferService.hostReject).toHaveBeenCalledWith('user-1', 'pod-1', 'No', 3);
  });

  it('price, save and withdraw an edit of the caller’s own counter, with the round that was read', async () => {
    await expect(query('editCounterQuote')({}, { pod_id: 'pod-1', terms }, ctx)).resolves.toBe('editPreview');
    expect(venueOfferReviseService.editPreview).toHaveBeenCalledWith('user-1', 'pod-1', terms);
    await expect(mutation('editVenueOfferCounter')({}, { pod_id: 'pod-1', terms, note: 'Flat is simpler', round: 3 }, ctx)).resolves.toBe(
      'editCounter'
    );
    expect(venueOfferReviseService.editCounter).toHaveBeenCalledWith('user-1', 'pod-1', terms, 'Flat is simpler', 3);
    await expect(mutation('withdrawVenueOfferCounter')({}, { pod_id: 'pod-1', round: 4 }, ctx)).resolves.toBe('withdrawCounter');
    expect(venueOfferReviseService.withdrawCounter).toHaveBeenCalledWith('user-1', 'pod-1', 4);
  });

  it('turn a signed-out caller away before a counter is touched', async () => {
    const anonymous = makeContext(null);
    const unauthenticated = expect.objectContaining({ extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }) });
    expect(() => mutation('withdrawVenueOfferCounter')({}, { pod_id: 'pod-1', round: 4 }, anonymous)).toThrow(unauthenticated);
    expect(() => query('editCounterQuote')({}, { pod_id: 'pod-1', terms }, anonymous)).toThrow(unauthenticated);
    expect(venueOfferReviseService.withdrawCounter).not.toHaveBeenCalled();
    expect(venueOfferReviseService.editPreview).not.toHaveBeenCalled();
  });

  it('tell every offer the counters each side may make, reading Pod Settings once per request', async () => {
    const countersPerSide = venueOfferResolvers.VenueBookingOffer.counters_per_side;
    const request = makeContext({ id: 'user-1' });
    await expect(countersPerSide({}, {}, request)).resolves.toBe(3);

    await settingsService.updateAppSettings({ venue_offer_max_counters: 10 });
    // The same request keeps the value it read for its first offer; the next request reads the new one.
    await expect(countersPerSide({}, {}, request)).resolves.toBe(3);
    await expect(countersPerSide({}, {}, makeContext({ id: 'user-1' }))).resolves.toBe(5);
  });

  it('send the venue’s accept and decline with the round that was read', async () => {
    const slotMutation = (name: string) => (venueSlotResolvers.Mutation as Record<string, Resolver>)[name];
    await slotMutation('approveVenueSlotRequest')({}, { slot_id: 'slot-1', round: 4 }, ctx);
    expect(venueSlotService.approveRequest).toHaveBeenCalledWith('user-1', 'slot-1', 4);
    await slotMutation('declineVenueSlotRequest')({}, { slot_id: 'slot-1', reason: 'Full', round: 4 }, ctx);
    expect(venueSlotService.declineRequest).toHaveBeenCalledWith('user-1', 'slot-1', 'Full', 4);
  });
});
