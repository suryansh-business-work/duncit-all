/**
 * Create Pod's offer to a venue: the minimum guests come from the venue (its
 * own setting, else the platform default) — never from the client — so a pod
 * books from that minimum up to the space's capacity; a client that lists
 * points for the venue must list at least one, while an app build from before
 * points lists none and still creates its pod.
 */
import { Types } from 'mongoose';
import { resolveVenueOfferForCreate } from '../../pod.venue';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueLocalYmd } from '@modules/venues/autoExtend/slotGenerator';
import type { VenueOfferRequest } from '@modules/venues/venueOffer/venueOffer.types';

const DAY_MS = 86_400_000;
const at = (hhmm: string) => new Date(`${venueLocalYmd(new Date(Date.now() + 3 * DAY_MS))}T${hhmm}:00+05:30`).toISOString();
const ownerId = new Types.ObjectId().toString();
const hostId = new Types.ObjectId().toString();

async function seedVenue(over: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Sky Deck',
    capacity: 30,
    capacity_items: [{ label: 'Terrace', capacity: 5 }],
    ...over,
  });
  return String(venue._id);
}

const offer = (over: Partial<VenueOfferRequest> = {}): VenueOfferRequest => ({
  start_at: at('18:00'),
  end_at: at('20:00'),
  space_label: '',
  model: 'PER_GUEST',
  rate: 500,
  offerings: ['Projector'],
  note: ' Keep it quiet ',
  ...over,
});

const input = (venueId: string, spots: number, venueOffer: VenueOfferRequest) => ({
  venue_id: venueId,
  no_of_spots: spots,
  pod_hosts_id: [hostId],
  venue_offer: venueOffer,
});

describe('a Create Pod offer', () => {
  it("asks the venue's own minimum, whatever minimum the client sent, with the points and the note cleaned", async () => {
    const venueId = await seedVenue({ settings: { offers: { min_guests: 10, response_hours: 0 } } });
    const resolved = await resolveVenueOfferForCreate(input(venueId, 20, offer({ min_guests: 1 })), 'PHYSICAL');
    expect(resolved?.request).toMatchObject({ pax: 20, min_guests: 10, offerings: ['Projector'], note: 'Keep it quiet' });
    expect(resolved?.quote).toMatchObject({ pax: 20 });
    expect(resolved?.own).toBe(false);
  });

  it('uses the platform default minimum (8) for a venue that set none', async () => {
    const venueId = await seedVenue();
    const resolved = await resolveVenueOfferForCreate(input(venueId, 12, offer()), 'PHYSICAL');
    expect(resolved?.request.min_guests).toBe(8);
  });

  it("refuses fewer spots than the venue's minimum, saying how many it takes", async () => {
    const venueId = await seedVenue({ settings: { offers: { min_guests: 10, response_hours: 0 } } });
    await expect(resolveVenueOfferForCreate(input(venueId, 6, offer()), 'PHYSICAL')).rejects.toMatchObject({
      message: 'This venue takes bookings for at least 10 guests — pick 10 spots or more',
      extensions: { reason: 'BELOW_VENUE_MINIMUM', min_guests: 10 },
    });
  });

  it("never asks a small space for more than it holds", async () => {
    const venueId = await seedVenue();
    const resolved = await resolveVenueOfferForCreate(input(venueId, 5, offer({ space_label: 'Terrace' })), 'PHYSICAL');
    expect(resolved?.request.min_guests).toBe(5);
  });

  it('requires at least one point from a client that sends points, and none from one that never does', async () => {
    const venueId = await seedVenue();
    await expect(resolveVenueOfferForCreate(input(venueId, 12, offer({ offerings: [' '] })), 'PHYSICAL')).rejects.toThrow(
      'Add at least one thing you need from the venue'
    );
    const legacy = await resolveVenueOfferForCreate(input(venueId, 12, offer({ offerings: undefined, note: undefined })), 'PHYSICAL');
    expect(legacy?.request).toMatchObject({ offerings: [], note: '', min_guests: 8 });
  });

  it('confirms at once at a venue the host owns', async () => {
    const venueId = await seedVenue();
    const resolved = await resolveVenueOfferForCreate({ ...input(venueId, 12, offer()), pod_hosts_id: [ownerId] }, 'PHYSICAL');
    expect(resolved?.own).toBe(true);
  });

  it('is refused for a venue that does not exist', async () => {
    await expect(resolveVenueOfferForCreate(input(String(new Types.ObjectId()), 12, offer()), 'PHYSICAL')).rejects.toThrow('Select a venue');
  });
});

describe('a free venue on Create Pod', () => {
  const freeOffer = (justification?: VenueOfferRequest['free_justification']) =>
    offer({ model: 'FREE', rate: 1200, free_justification: justification });

  it("is asked at no money, with the host's justification checked and stamped", async () => {
    const venueId = await seedVenue();
    const resolved = await resolveVenueOfferForCreate(
      input(venueId, 12, freeOffer({ reason: 'CAMPAIGN', details: ' Diwali  drive ', accepted: true })),
      'PHYSICAL',
      hostId
    );
    expect(resolved?.quote).toMatchObject({ total: 0, venue_payout: 0 });
    expect(resolved?.request).toMatchObject({ model: 'FREE', free_justification: null });
    expect(resolved?.freeJustification).toMatchObject({ reason: 'CAMPAIGN', details: 'Diwali drive' });
    expect(String(resolved?.freeJustification?.accepted_by)).toBe(hostId);
  });

  it('is refused without a justification, or without the policy accepted', async () => {
    const venueId = await seedVenue();
    await expect(resolveVenueOfferForCreate(input(venueId, 12, freeOffer()), 'PHYSICAL', hostId)).rejects.toMatchObject({
      extensions: { reason: 'FREE_REASON_REQUIRED' },
    });
    await expect(
      resolveVenueOfferForCreate(input(venueId, 12, freeOffer({ reason: 'INITIATIVE', accepted: false })), 'PHYSICAL', hostId)
    ).rejects.toMatchObject({ extensions: { reason: 'FREE_POLICY_NOT_ACCEPTED' } });
  });

  it('is refused when nobody is there to accept the policy (a re-route, not the host)', async () => {
    const venueId = await seedVenue();
    await expect(
      resolveVenueOfferForCreate(input(venueId, 12, freeOffer({ reason: 'INITIATIVE', accepted: true })), 'PHYSICAL')
    ).rejects.toMatchObject({ extensions: { reason: 'FREE_HOST_ONLY' } });
  });

  it('keeps a priced offer free of any justification', async () => {
    const venueId = await seedVenue();
    const resolved = await resolveVenueOfferForCreate(
      input(venueId, 12, offer({ free_justification: { reason: 'CAMPAIGN', accepted: true } })),
      'PHYSICAL',
      hostId
    );
    expect(resolved?.freeJustification).toBeNull();
    expect(resolved?.quote.total).toBeGreaterThan(0);
  });
});
