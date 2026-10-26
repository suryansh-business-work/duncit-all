/**
 * The purge of a live run's fixture world, against a real database: the venue,
 * host profile, slots, Pod Requests, food coupons, pods, share links and club
 * the run account builds as a partner go with it; anything that also belongs
 * to somebody else, or to another run, stays.
 *
 * The overrides switch is mocked (it is a cached settings read) and so is the
 * ImageKit media library (a network call the purge already treats as
 * best-effort); every Mongo write is the real one.
 */
const mockOverrides = {
  muted: true,
  otpBypass: true,
  account: { email: /^qa\+\d{12}(-[a-z0-9-]+)?@duncit\.com$/, phone: '' },
};
jest.mock('../../e2eRun.mute', () => ({
  ...jest.requireActual('../../e2eRun.mute'),
  e2eOverrides: jest.fn(async () => mockOverrides),
}));
jest.mock('@modules/platform/upload/mediaLibrary.service', () => ({
  mediaLibraryService: { list: jest.fn(async () => []), remove: jest.fn(async () => 0) },
}));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ShortLinkModel } from '@modules/crm/marketing/shortLink.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { HostModel } from '@modules/venues/host/host.model';
import { PodPartnerRequestModel } from '@modules/venues/podPartnerRequest/podPartnerRequest.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueFoodCouponModel } from '@modules/venues/venueFood/venueFoodCoupon.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { purgeE2eRunData } from '../../e2eRun.purge';

const STAMP = '141020260300';
const RUN_EMAIL = `qa+${STAMP}@duncit.com`;
const INPUT = { stamp: STAMP, signup_email: RUN_EMAIL };
const DAY_MS = 24 * 60 * 60 * 1000;

const deletedFrom = (records: Array<{ collection: string; deleted: number }>, collection: string) =>
  records.find((record) => record.collection === collection)?.deleted;

async function createUser(email: string): Promise<Types.ObjectId> {
  const user = await UserModel.create({ auth: { email }, profile: { first_name: 'E2E', last_name: 'Fixture' } });
  return user._id;
}

async function createClub(name: string, slug: string, admins: Types.ObjectId[] = []) {
  const club = await ClubModel.create({ club_id: slug, club_name: name, admin_user_ids: admins });
  return club._id as Types.ObjectId;
}

async function createPod(title: string, clubId: Types.ObjectId, hosts: Types.ObjectId[], extra: Record<string, unknown> = {}) {
  const pod = await PodModel.create({
    pod_id: title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
    pod_title: title,
    pod_hosts_id: hosts,
    pod_attendees: hosts,
    club_id: clubId,
    pod_description: 'Fixture pod',
    pod_date_time: new Date(Date.now() + 7 * DAY_MS),
    pod_type: 'FREE',
    ...extra,
  });
  return pod._id as Types.ObjectId;
}

async function createShareLink(code: string, createdBy: string) {
  await ShortLinkModel.create({
    code,
    label: 'Venue page',
    destination_url: 'https://duncit.com/venues/fixture',
    source: 'DIRECT_LINK_SHARE',
    medium: 'REFERRAL',
    utm_source: 'direct_link_share',
    utm_medium: 'referral',
    created_by: createdBy,
  });
}

/** The fixture world one run builds, plus what belongs to a stranger and to another run. */
async function buildWorld() {
  const run = await createUser(RUN_EMAIL);
  const runAlias = await createUser(`qa+${STAMP}-new@duncit.com`);
  const stranger = await createUser('someone@example.com');

  const runClub = await createClub(`[E2E ${STAMP} club]`, `e2e-${STAMP}-club`, [run]);
  const otherRunClub = await createClub('[E2E 010120260000 club]', 'e2e-010120260000-club');
  const strangerClub = await createClub('Morning Runners', 'morning-runners', [stranger]);

  const venue = await VenueModel.create({ owner_user_id: run, venue_name: `[E2E ${STAMP} venue]`, status: 'APPROVED' });
  await HostModel.create({ user_id: run, status: 'APPROVED' });
  await VenueSlotModel.create({
    venue_id: venue._id,
    owner_user_id: run,
    start_at: new Date(Date.now() + 7 * DAY_MS),
    end_at: new Date(Date.now() + 7 * DAY_MS + 2 * 60 * 60 * 1000),
  });
  await VenueFoodCouponModel.create({ venue_id: venue._id, code: 'E2EFIXTURE', discount_pct: 10, created_by: run });
  await PodPartnerRequestModel.create({
    direction: 'HOST_TO_VENUE',
    venue_id: new Types.ObjectId(),
    venue_owner_user_id: stranger,
    host_user_id: run,
  });

  const freePod = await createPod(`[E2E ${STAMP} free pod]`, runClub, [run], { venue_id: venue._id });
  const cancelledPod = await createPod(`[E2E ${STAMP} cancelled pod]`, runClub, [run, runAlias], {
    deleted_at: new Date(),
  });
  const sharedPod = await createPod('Shared Sunday Run', strangerClub, [stranger, run]);
  const strangerPod = await createPod('Stranger Evening Walk', strangerClub, [stranger]);
  await PodMemberModel.create({ pod_id: freePod, user_id: stranger });
  await PodMemberModel.create({ pod_id: strangerPod, user_id: stranger });
  await PodAuditLogModel.create({ pod_id: freePod, source: 'HOST', action: 'CREATE' });
  await PodAuditLogModel.create({ pod_id: strangerPod, source: 'HOST', action: 'CREATE' });

  await createShareLink('runvenue1', String(run));
  await createShareLink('strangerlink', String(stranger));

  return { run, stranger, runClub, otherRunClub, strangerClub, freePod, cancelledPod, sharedPod, strangerPod };
}

beforeEach(() => {
  mockOverrides.otpBypass = true;
});

describe('purgeE2eRunData — the fixture world', () => {
  it('removes the venue, host profile, slots, Pod Requests, coupons, pods, share links and club the run built', async () => {
    const world = await buildWorld();

    const res = await purgeE2eRunData(INPUT);

    expect(res.accounts_deleted).toBe(2);
    expect(deletedFrom(res.records, PodModel.collection.name)).toBe(2);
    expect(deletedFrom(res.records, PodMemberModel.collection.name)).toBe(1);
    expect(deletedFrom(res.records, PodAuditLogModel.collection.name)).toBe(1);
    expect(deletedFrom(res.records, ShortLinkModel.collection.name)).toBe(1);
    expect(deletedFrom(res.records, ClubModel.collection.name)).toBe(1);

    expect(await VenueModel.countDocuments()).toBe(0);
    expect(await HostModel.countDocuments()).toBe(0);
    expect(await VenueSlotModel.countDocuments()).toBe(0);
    expect(await VenueFoodCouponModel.countDocuments()).toBe(0);
    expect(await PodPartnerRequestModel.countDocuments()).toBe(0);
    const podsLeft = await PodModel.find({}, { _id: 1 }).setOptions({ includeDeleted: true }).lean();
    expect(podsLeft.map((pod) => String(pod._id)).sort()).toEqual(
      [String(world.sharedPod), String(world.strangerPod)].sort(),
    );
    expect(await ClubModel.exists({ _id: world.runClub })).toBeNull();
  });

  it('leaves a co-hosted pod to its other host, and keeps what a stranger or another run owns', async () => {
    const world = await buildWorld();

    await purgeE2eRunData(INPUT);

    const shared = await PodModel.findById(world.sharedPod).lean();
    expect(shared?.pod_hosts_id.map(String)).toEqual([String(world.stranger)]);
    expect(await PodMemberModel.countDocuments({ pod_id: world.strangerPod })).toBe(1);
    expect(await PodAuditLogModel.countDocuments({ pod_id: world.strangerPod })).toBe(1);
    expect(await ShortLinkModel.countDocuments({ created_by: String(world.stranger) })).toBe(1);
    expect(await ClubModel.exists({ _id: world.otherRunClub })).not.toBeNull();
    expect(await ClubModel.exists({ _id: world.strangerClub })).not.toBeNull();
    expect(await UserModel.exists({ _id: world.stranger })).not.toBeNull();
  });

  it('is idempotent: a second purge finds nothing left to remove', async () => {
    await buildWorld();
    await purgeE2eRunData(INPUT);

    const again = await purgeE2eRunData(INPUT);

    expect(again.accounts_deleted).toBe(0);
    for (const model of [PodModel, PodMemberModel, PodAuditLogModel, ShortLinkModel, ClubModel]) {
      expect(deletedFrom(again.records, model.collection.name)).toBe(0);
    }
  });

  it('removes nothing while one-time codes for the run account are off', async () => {
    const world = await buildWorld();
    mockOverrides.otpBypass = false;

    await expect(purgeE2eRunData(INPUT)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });

    expect(await PodModel.exists({ _id: world.freePod })).not.toBeNull();
    expect(await ClubModel.exists({ _id: world.runClub })).not.toBeNull();
    expect(await VenueModel.countDocuments()).toBe(1);
    expect(await ShortLinkModel.countDocuments()).toBe(2);
  });
});
