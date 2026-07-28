import { Types } from 'mongoose';
import { podPendingViewResolvers } from '../../podPendingView.resolver';
import { podPendingViewService } from '../../podPendingView.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { breakdownService } from '@modules/finance/finance/breakdown.service';
import { makeContext } from '@test/harness';

const view = podPendingViewResolvers.Query.hostPodPendingView;

let seq = 0;

async function seedHost() {
  return UserModel.create({
    auth: { email: `pv-host${++seq}@x.com` },
    profile: { first_name: 'Ravi', last_name: 'Host' },
  });
}

async function seedClubAdminUser() {
  return UserModel.create({
    auth: {
      email: `pv-admin${++seq}@x.com`,
      phone: { number: '9876543210', extension: '91' },
    },
    profile: { first_name: 'Asha', last_name: 'Verma', profile_photo: 'https://img/asha.jpg' },
    communication: { whatsapp: { extension: '+91', number: '9876543211' } },
  });
}

async function seedClub(over: Record<string, unknown> = {}) {
  return ClubModel.create({
    club_id: `pv-club-${++seq}`,
    club_name: 'Chess Club',
    ...over,
  });
}

async function seedVenue(over: Record<string, unknown> = {}) {
  return VenueModel.create({
    owner_user_id: new Types.ObjectId(),
    venue_name: 'Riverside Hall',
    owner_name: 'Meera Owner',
    owner_phone: '9000000001',
    owner_email: 'owner@venue.com',
    address_line1: '12 Lake Road',
    locality: 'Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560038',
    lat: 12.97,
    lng: 77.64,
    ...over,
  });
}

async function seedSlot(venue: { _id: Types.ObjectId; owner_user_id: Types.ObjectId }, price: number) {
  return VenueSlotModel.create({
    venue_id: venue._id,
    owner_user_id: venue.owner_user_id,
    start_at: new Date(Date.now() + 86_400_000),
    end_at: new Date(Date.now() + 90_000_000),
    price,
    status: 'PENDING',
  });
}

async function seedPod(over: Record<string, unknown> = {}) {
  return PodModel.create({
    pod_id: `pv-pod-${++seq}`,
    pod_title: 'Poetry evening',
    pod_hosts_id: [new Types.ObjectId()],
    club_id: new Types.ObjectId(),
    pod_description: 'Calm conversations',
    pod_date_time: new Date(Date.now() + 86_400_000),
    pod_type: 'PAID',
    pod_amount: 1000,
    no_of_spots: 3,
    pod_images_and_videos: [{ url: 'https://img/pod.jpg', type: 'IMAGE' }],
    is_active: false,
    venue_approval_status: 'PENDING',
    ...over,
  });
}

describe('hostPodPendingView — authorization', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(
      view(undefined, { pod_doc_id: new Types.ObjectId().toString() }, makeContext(null))
    ).rejects.toThrow(/not authenticated/i);
  });

  it('rejects invalid and unknown pod ids', async () => {
    const ctx = makeContext({ id: new Types.ObjectId().toString() });
    await expect(view(undefined, { pod_doc_id: 'bad-id' }, ctx)).rejects.toThrow(/invalid pod id/i);
    await expect(
      view(undefined, { pod_doc_id: new Types.ObjectId().toString() }, ctx)
    ).rejects.toThrow(/pod not found/i);
  });

  it('a non-host gets FORBIDDEN — venue/admin contacts are PII', async () => {
    const pod = await seedPod();
    const stranger = makeContext({ id: new Types.ObjectId().toString() });
    await expect(view(undefined, { pod_doc_id: String(pod._id) }, stranger)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
  });

  it('a DECLINED co-host is refused; a PENDING/ACCEPTED co-host may read', async () => {
    const declined = new Types.ObjectId();
    const accepted = new Types.ObjectId();
    const pod = await seedPod({
      co_hosts: [
        { user_id: declined, status: 'DECLINED', invited_at: new Date() },
        { user_id: accepted, status: 'ACCEPTED', invited_at: new Date() },
      ],
    });
    await expect(
      view(undefined, { pod_doc_id: String(pod._id) }, makeContext({ id: String(declined) }))
    ).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });

    const res = await view(
      undefined,
      { pod_doc_id: String(pod._id) },
      makeContext({ id: String(accepted) })
    );
    expect(res.pod.id).toBe(String(pod._id));
  });
});

describe('hostPodPendingView — the host sees the full waiting-screen data', () => {
  it('returns pod, venue contact, club admin contact, category and earnings for a PENDING pod', async () => {
    const host = await seedHost();
    const admin = await seedClubAdminUser();
    const category = await CategoryModel.create({
      name: 'Board Games',
      slug: `board-games-${++seq}`,
      level: 'CATEGORY',
    });
    const club = await seedClub({ admin_user_ids: [admin._id], category_id: category._id });
    const venue = await seedVenue();
    const slot = await seedSlot(venue, 400);
    const pod = await seedPod({
      pod_hosts_id: [host._id],
      club_id: club._id,
      venue_id: venue._id,
      venue_slot_id: slot._id,
    });

    const res = await view(
      undefined,
      { pod_doc_id: String(pod._id) },
      makeContext({ id: String(host._id) })
    );

    // Pod card — reuses the public Pod shape.
    expect(res.pod.pod_title).toBe('Poetry evening');
    expect(res.pod.venue_approval_status).toBe('PENDING');
    expect(res.pod.pod_images_and_videos[0].url).toBe('https://img/pod.jpg');
    expect(res.pod.club_slug).toBe(club.club_id);
    expect(res.category_name).toBe('Board Games');

    // Venue card.
    expect(res.venue).toMatchObject({
      venue_id: String(venue._id),
      venue_name: 'Riverside Hall',
      contact_person: 'Meera Owner',
      phone: '9000000001',
      email: 'owner@venue.com',
      lat: 12.97,
      lng: 77.64,
    });
    expect(res.venue?.address).toBe(
      '12 Lake Road, Indiranagar, Bengaluru, Karnataka, 560038, India'
    );

    // Club-admin card — extensions normalized to a leading "+".
    expect(res.club_admin).toMatchObject({
      user_id: String(admin._id),
      name: 'Asha Verma',
      profile_photo: 'https://img/asha.jpg',
      phone: '+91 9876543210',
      whatsapp: '+91 9876543211',
      email: admin.auth.email,
    });

    // Earnings mirror the finance engine exactly (server owns the math).
    const projection = await breakdownService.potentialPodEarnings(
      String(host._id),
      1000,
      3,
      String(venue._id),
      400
    );
    expect(res.expected_earnings).toBe(projection.waterfall.host_receives);
    expect(res.currency_symbol).toBeTruthy();
  });

  it('works at any approval status — an APPROVED pod reports APPROVED', async () => {
    const host = await seedHost();
    const pod = await seedPod({
      pod_hosts_id: [host._id],
      venue_approval_status: 'APPROVED',
      is_active: true,
    });
    const res = await view(
      undefined,
      { pod_doc_id: String(pod._id) },
      makeContext({ id: String(host._id) })
    );
    expect(res.pod.venue_approval_status).toBe('APPROVED');
    expect(res.pod.is_active).toBe(true);
  });

  it('virtual pod → venue null; admin-less club → club_admin null; free pod → 0 earnings', async () => {
    const host = await seedHost();
    const club = await seedClub();
    const pod = await seedPod({
      pod_hosts_id: [host._id],
      club_id: club._id,
      pod_mode: 'VIRTUAL',
      meeting_platform: 'Zoom',
      meeting_url: 'https://zoom.us/j/1',
      pod_type: 'FREE',
      pod_amount: 0,
      venue_approval_status: 'NONE',
    });
    const res = await view(
      undefined,
      { pod_doc_id: String(pod._id) },
      makeContext({ id: String(host._id) })
    );
    expect(res.venue).toBeNull();
    expect(res.club_admin).toBeNull();
    expect(res.category_name).toBe('');
    expect(res.expected_earnings).toBe(0);
  });

  it('tolerates dangling refs and blank contact fields', async () => {
    const host = await seedHost();
    // Venue id that no longer resolves → venue card is null, not an error.
    const ghost = await seedPod({
      pod_hosts_id: [host._id],
      venue_id: new Types.ObjectId(),
    });
    const ghostRes = await view(
      undefined,
      { pod_doc_id: String(ghost._id) },
      makeContext({ id: String(host._id) })
    );
    expect(ghostRes.venue).toBeNull();

    // Blank owner details + club admin user deleted → nulls, never ''.
    const bareVenue = await seedVenue({
      owner_name: '',
      owner_phone: '',
      owner_email: '',
      address_line1: '',
      locality: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      lat: null,
      lng: null,
    });
    const club = await seedClub({ admin_user_ids: [new Types.ObjectId()] });
    const pod = await seedPod({
      pod_hosts_id: [host._id],
      club_id: club._id,
      venue_id: bareVenue._id,
    });
    const res = await view(
      undefined,
      { pod_doc_id: String(pod._id) },
      makeContext({ id: String(host._id) })
    );
    expect(res.venue).toMatchObject({
      contact_person: null,
      phone: null,
      email: null,
      address: null,
      lat: null,
      lng: null,
    });
    expect(res.club_admin).toBeNull();
  });

  it('service guard: a host id that is not first in pod_hosts_id still reads', async () => {
    const primary = await seedHost();
    const second = await seedHost();
    const pod = await seedPod({ pod_hosts_id: [primary._id, second._id] });
    const res = await podPendingViewService.hostPodPendingView(String(pod._id), String(second._id));
    expect(res.pod.pod_hosts_id).toEqual([String(primary._id), String(second._id)]);
  });
});
