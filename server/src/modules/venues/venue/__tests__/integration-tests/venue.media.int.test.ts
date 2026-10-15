import { Types } from 'mongoose';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '../../venue.model';
import { venueService } from '../../venue.service';

/**
 * A venue's videos, licences and table list through the real venue writes:
 * registration step 1 and the owner's edit of an approved venue. Each list is
 * checked before it is stored — never spread on raw — and a write that leaves
 * one out keeps what is stored.
 */

const CLIP = 'https://ik.imagekit.io/duncit/prod/venues/clip.mp4';
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const FSSAI = '12345678901234';
const ownerId = new Types.ObjectId().toHexString();

const videosOf = async (venueId: string) => (await VenueModel.findById(venueId).lean())?.videos;

async function seedApprovedVenue(over: Record<string, unknown> = {}) {
  const venue = await VenueModel.create({
    owner_user_id: ownerId,
    status: 'APPROVED',
    is_active: true,
    venue_name: 'Cafe Uno',
    ...over,
  });
  return String(venue._id);
}

describe('registration step 1 — the venue videos', () => {
  beforeEach(async () => {
    await LocationModel.create({
      location_id: 'pune',
      location_name: 'Pune',
      country: 'India',
      country_code: 'IN',
      state: 'Maharashtra',
      state_code: 'MH',
      city: 'Pune',
      location_image: 'https://img.example.test/pune.jpg',
      location_pincode: '411001',
      location_zones: [],
    });
  });

  it('stores the checked list, keeps it when a later save leaves it out, and refuses a channel link', async () => {
    const owner = new Types.ObjectId().toHexString();
    const saved = await venueService.submitStep1(owner, { city: 'Pune', venue_name: 'Cafe', videos: [` ${YOUTUBE} `, CLIP, CLIP] });
    expect(saved.videos).toEqual([YOUTUBE, CLIP]);

    await venueService.submitStep1(owner, { city: 'Pune', venue_name: 'Cafe Uno' }, saved.id);
    expect(await videosOf(saved.id)).toEqual([YOUTUBE, CLIP]);

    await expect(
      venueService.submitStep1(owner, { city: 'Pune', venue_name: 'Cafe', videos: ['https://www.youtube.com/channel/UC123'] }, saved.id)
    ).rejects.toThrow(/YouTube video link/);
    expect(await videosOf(saved.id)).toEqual([YOUTUBE, CLIP]);
  });

  it('ignores a videos value that is not a list rather than storing it raw', async () => {
    const owner = new Types.ObjectId().toHexString();
    const saved = await venueService.submitStep1(owner, { city: 'Pune', venue_name: 'Cafe', videos: 'javascript:alert(1)' });
    expect(saved.videos).toEqual([]);
  });
});

describe("the owner's edit of an approved venue", () => {
  it('replaces the videos with the checked list, keeps them when left out, and refuses more than five', async () => {
    const venueId = await seedApprovedVenue();
    const updated = await venueService.updateApproved(ownerId, venueId, { videos: [CLIP, YOUTUBE] });
    expect(updated.videos).toEqual([CLIP, YOUTUBE]);

    await venueService.updateApproved(ownerId, venueId, { description: 'New' });
    expect(await videosOf(venueId)).toEqual([CLIP, YOUTUBE]);

    const six = Array.from({ length: 6 }, (_, index) => `${CLIP}?n=${index}`);
    await expect(venueService.updateApproved(ownerId, venueId, { videos: six })).rejects.toThrow(
      'The venue can have at most 5 videos'
    );
    await expect(venueService.updateApproved(ownerId, venueId, { videos: ['not a link'] })).rejects.toThrow(
      'Enter a valid video link for The venue'
    );
    expect(await videosOf(venueId)).toEqual([CLIP, YOUTUBE]);

    await venueService.updateApproved(ownerId, venueId, { videos: [] });
    expect(await videosOf(venueId)).toEqual([]);
  });

  it('saves the licences and the tables, and refuses a bad FSSAI number without touching what is stored', async () => {
    const venueId = await seedApprovedVenue({ offers_food: true });
    await venueService.updateApproved(ownerId, venueId, {
      food_licences: { fssai_number: FSSAI, fssai_document_url: 'https://ik.imagekit.io/duncit/fssai.pdf' },
      food_tables: ['1', ' 2 ', 'Patio', 'PATIO'],
    });
    const saved = await VenueModel.findById(venueId).lean();
    expect(saved?.food_licences).toMatchObject({ fssai_number: FSSAI, fssai_document_url: 'https://ik.imagekit.io/duncit/fssai.pdf' });
    expect(saved?.food_tables).toEqual(['1', '2', 'Patio']);

    await expect(
      venueService.updateApproved(ownerId, venueId, { food_licences: { fssai_number: '1234' } })
    ).rejects.toThrow('The FSSAI number must be 14 digits');
    expect((await VenueModel.findById(venueId).lean())?.food_licences?.fssai_number).toBe(FSSAI);
  });
});
