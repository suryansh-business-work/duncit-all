/**
 * Every move of a booking offer becomes a line in the venue chat: the terms as
 * they stood, frozen (the hold is deleted on a decline or an expiry), and a
 * one-line summary — the inbox preview, and what an older app build shows in
 * place of the offer card.
 */
jest.mock('@modules/finance/finance/finance.model', () => ({ getFinanceSettings: jest.fn() }));
jest.mock('@microservices/chat/venue/venueChat.service', () => ({ venueChatService: { postOffer: jest.fn() } }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } } }));
jest.mock('@microservices/chat/venue/venueChat.lines', () => ({
  venueChatLineService: { reviseOfferLine: jest.fn(), withdrawOfferLine: jest.fn(), renumberOfferLine: jest.fn() },
}));

import { Types } from 'mongoose';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { venueChatService } from '@microservices/chat/venue/venueChat.service';
import { venueChatLineService } from '@microservices/chat/venue/venueChat.lines';
import { logs } from '@observability/log';
import { offerLinePayload, offerLineText, postOfferLine, removeOfferLine, rewriteOfferLine } from '../../venueOffer.chat';
import type { OfferQuote, VenueOffer, VenueOfferProposal } from '../../venueOffer.types';

const finance = getFinanceSettings as jest.Mock;
const postOffer = venueChatService.postOffer as jest.Mock;
const reviseOfferLine = venueChatLineService.reviseOfferLine as jest.Mock;
const withdrawOfferLine = venueChatLineService.withdrawOfferLine as jest.Mock;
const renumberOfferLine = venueChatLineService.renumberOfferLine as jest.Mock;

const q = (venue_payout: number, total: number) => ({ venue_payout, total }) as unknown as OfferQuote;
const slotId = new Types.ObjectId();
const ownerId = new Types.ObjectId();
const start = new Date('2027-01-04T12:30:00.000Z');
const end = new Date('2027-01-04T14:30:00.000Z');

const terms = (over: Partial<VenueOfferProposal> = {}): VenueOfferProposal => ({
  model: 'PER_GUEST',
  rate: 500,
  min_guests: 8,
  offerings: ['Projector'],
  note: 'Keep the AC on',
  quote: q(10_000, 11_000),
  quote_min: q(4000, 4400),
  charges: null,
  ...over,
});

const slot = (offer: Partial<VenueOffer> | null = { pax: 20, pets: true }) =>
  ({ _id: slotId, start_at: start, end_at: end, space_label: 'Terrace', offer, owner_user_id: ownerId }) as never;

beforeEach(() => {
  finance.mockResolvedValue({ currency_symbol: '₹' });
  postOffer.mockResolvedValue({ id: 'line-1' });
  reviseOfferLine.mockResolvedValue(undefined);
  withdrawOfferLine.mockResolvedValue(undefined);
  renumberOfferLine.mockResolvedValue(undefined);
});

describe('offerLinePayload', () => {
  it('freezes the terms, both ends of the money and the deadline', () => {
    const expiresAt = new Date('2027-01-03T12:30:00.000Z');
    expect(offerLinePayload(slot(), terms(), { event: 'OFFER', by: 'HOST', round: 1, expiresAt })).toEqual({
      slot_id: String(slotId),
      round: 1,
      event: 'OFFER',
      by: 'HOST',
      model: 'PER_GUEST',
      rate: 500,
      min_guests: 8,
      max_guests: 20,
      offerings: ['Projector'],
      note: 'Keep the AC on',
      start_at: start,
      end_at: end,
      space_label: 'Terrace',
      pets: true,
      venue_receives_min: 4000,
      venue_receives_max: 10_000,
      total_min: 4400,
      total_max: 11_000,
      expires_at: expiresAt,
      reason: '',
      images: [],
    });
  });

  it("carries the photos attached to a counter, as their own copy", () => {
    const images = ['https://ik.imagekit.io/duncit/staging/offer/setup.jpg'];
    const payload = offerLinePayload(slot(), terms({ images }), { event: 'COUNTER', by: 'VENUE', round: 2, expiresAt: null });
    expect(payload.images).toEqual(images);
    expect(payload.images).not.toBe(images);
  });

  it('reads terms from before minimums as their guests at both ends', () => {
    const payload = offerLinePayload(
      { _id: slotId, start_at: start, end_at: end, space_label: undefined, offer: { pax: 12, pets: false } } as never,
      terms({ min_guests: 0, quote_min: null, offerings: undefined as never, note: undefined as never }),
      { event: 'DECLINED', by: 'VENUE', round: 2, expiresAt: null, reason: '  Fully booked  ' }
    );
    expect(payload).toMatchObject({
      min_guests: 12,
      max_guests: 12,
      offerings: [],
      note: '',
      space_label: '',
      venue_receives_min: 10_000,
      total_min: 11_000,
      reason: 'Fully booked',
    });
  });

  it('copes with a slot that lost its offer', () => {
    const payload = offerLinePayload(slot(null), terms(), { event: 'EXPIRED', by: 'SYSTEM', round: 3, expiresAt: null });
    expect(payload).toMatchObject({ max_guests: 0, min_guests: 8, pets: false });
  });
});

describe('offerLineText', () => {
  const base = offerLinePayload(slot(), terms(), { event: 'OFFER', by: 'HOST', round: 1, expiresAt: null });

  it('says what was offered, for how many and what the venue receives', () => {
    expect(offerLineText(base, '₹')).toBe('Booking offer: ₹500 per guest · 8–20 guests · venue receives ₹4,000–₹10,000');
    expect(offerLineText({ ...base, event: 'COUNTER' }, '₹')).toMatch(/^Counter offer: /);
    expect(offerLineText({ ...base, event: 'ACCEPTED' }, '₹')).toMatch(/^Offer accepted: /);
  });

  it('prints one figure when both ends agree', () => {
    const flat = { ...base, model: 'FLAT', rate: 7000, min_guests: 20, venue_receives_min: 7000, venue_receives_max: 7000 };
    expect(offerLineText(flat, '$')).toBe('Booking offer: $7,000 flat · 20 guests · venue receives $7,000');
  });

  it('names an unknown model by its amount alone', () => {
    expect(offerLineText({ ...base, model: 'BARTER' }, '₹')).toMatch(/^Booking offer: ₹500 · /);
  });

  it('says why an offer was declined, when someone said', () => {
    expect(offerLineText({ ...base, event: 'DECLINED', reason: 'Fully booked' }, '₹')).toBe('Offer declined: Fully booked');
    expect(offerLineText({ ...base, event: 'DECLINED', reason: '' }, '₹')).toBe('Offer declined');
  });

  it('says an offer ran out', () => {
    expect(offerLineText({ ...base, event: 'EXPIRED' }, '₹')).toBe('Offer expired — no answer in time');
  });
});

describe('postOfferLine', () => {
  const move = { event: 'COUNTER' as const, by: 'VENUE' as const, round: 2, expiresAt: null };

  it("posts the move as the venue's owner on the venue's side, and returns its summary", async () => {
    const text = await postOfferLine({ podId: 'pod-1', slot: slot(), terms: terms(), side: 'VENUE', hostId: 'host-1', move });
    expect(text).toBe('Counter offer: ₹500 per guest · 8–20 guests · venue receives ₹4,000–₹10,000');
    expect(postOffer).toHaveBeenCalledWith(
      expect.objectContaining({ podId: 'pod-1', side: 'VENUE', userId: String(ownerId), text, offer: expect.objectContaining({ event: 'COUNTER' }) })
    );
  });

  it("posts a host's move as that host, in the platform's currency", async () => {
    finance.mockResolvedValue({ currency_symbol: '' });
    const text = await postOfferLine({ podId: 'pod-1', slot: slot(), terms: terms(), side: 'HOST', hostId: 'host-7', move });
    expect(text).toContain('₹500');
    expect(postOffer).toHaveBeenCalledWith(expect.objectContaining({ side: 'HOST', userId: 'host-7' }));
  });

  it('never fails the move: a line that cannot be posted is logged, and its lead still returned', async () => {
    finance.mockRejectedValue(new Error('db down'));
    const text = await postOfferLine({ podId: 'pod-1', slot: slot(), terms: terms(), side: 'VENUE', hostId: '', move });
    expect(text).toBe('Counter offer');
    expect(logs.server.error).toHaveBeenCalledWith('venueOffer', 'postOfferLine', expect.objectContaining({ pod_id: 'pod-1', event: 'COUNTER' }));
  });
});

describe('rewriteOfferLine', () => {
  const move = { event: 'COUNTER' as const, by: 'VENUE' as const, round: 3, expiresAt: null };
  const edited = terms({ model: 'FLAT', rate: 9000, quote: q(9000, 9900), quote_min: q(9000, 9900), images: ['https://ik.imagekit.io/duncit/offer/hall.jpg'] });

  it('rewrites the counter’s own line with the edited terms under the new round, and returns its summary', async () => {
    const text = await rewriteOfferLine({ lineId: 'line-7', slot: slot(), terms: edited, move });
    expect(text).toBe('Counter offer: ₹9,000 flat · 8–20 guests · venue receives ₹9,000');
    expect(reviseOfferLine).toHaveBeenCalledWith(
      'line-7',
      expect.objectContaining({ round: 3, event: 'COUNTER', by: 'VENUE', model: 'FLAT', rate: 9000, images: edited.images }),
      text
    );
  });

  it('never fails the saved edit: a line that cannot be rewritten is logged, the summary still returned', async () => {
    reviseOfferLine.mockRejectedValue(new Error('chat down'));
    const text = await rewriteOfferLine({ lineId: 'line-7', slot: slot(), terms: edited, move });
    expect(text).toBe('Counter offer: ₹9,000 flat · 8–20 guests · venue receives ₹9,000');
    expect(logs.server.error).toHaveBeenCalledWith('venueOffer', 'rewriteOfferLine', expect.objectContaining({ slot_id: String(slotId) }));
  });

  it('falls back to the lead alone when the currency cannot be read, and rewrites nothing', async () => {
    finance.mockRejectedValue(new Error('db down'));
    await expect(rewriteOfferLine({ lineId: 'line-7', slot: slot(), terms: edited, move })).resolves.toBe('Counter offer');
    expect(reviseOfferLine).not.toHaveBeenCalled();
  });
});

describe('removeOfferLine', () => {
  const args = { lineId: 'line-9', podId: 'pod-1', slotId: String(slotId), restored: { from: 1, to: 3 } };

  it("takes the withdrawn counter's line out, then carries the new round on the restored move's line", async () => {
    await expect(removeOfferLine(args)).resolves.toBeUndefined();
    expect(withdrawOfferLine).toHaveBeenCalledWith('line-9', 'pod-1');
    expect(renumberOfferLine).toHaveBeenCalledWith('pod-1', String(slotId), 1, 3);
    expect(withdrawOfferLine.mock.invocationCallOrder[0]).toBeLessThan(renumberOfferLine.mock.invocationCallOrder[0]);
  });

  it('never throws: a failure is logged with the pod, and nothing after it runs', async () => {
    withdrawOfferLine.mockRejectedValue(new Error('chat down'));
    await expect(removeOfferLine(args)).resolves.toBeUndefined();
    expect(renumberOfferLine).not.toHaveBeenCalled();
    expect(logs.server.error).toHaveBeenCalledWith('venueOffer', 'removeOfferLine', expect.objectContaining({ pod_id: 'pod-1' }));
  });
});
