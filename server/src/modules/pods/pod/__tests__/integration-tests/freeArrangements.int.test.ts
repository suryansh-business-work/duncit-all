/**
 * Free pods must say why they are free. A host making a pod FREE names the
 * reason and accepts Duncit's free policy — refused otherwise — and the
 * server stamps who accepted it and when; staff may give one. The Pods
 * console's Free Arrangements table then lists every free pod and every pod
 * whose venue was asked for free, with that justification.
 */
import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { podFreeArrangementsService } from '../../pod.freeArrangements';
import { UserModel } from '@modules/access/user/user.model';
import { notificationService } from '@modules/engagement/notification/notification.service';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };

let hostId: string;

beforeEach(async () => {
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const host = await UserModel.create({
    auth: { email: `free-host-${new Types.ObjectId()}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Rao' },
  });
  hostId = String(host._id);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const freeInput = (over: Record<string, unknown> = {}) => ({
  pod_title: `Free pod ${Math.random().toString(36).slice(2)}`,
  club_id: String(new Types.ObjectId()),
  pod_hosts_id: [hostId],
  pod_mode: 'VIRTUAL',
  meeting_url: 'https://meet.example.com/x',
  pod_description: 'A community evening',
  pod_type: 'FREE',
  pod_amount: 0,
  no_of_spots: 10,
  pod_date_time: inDays(2),
  pod_end_date_time: inDays(2.1),
  pod_images_and_videos: [IMG],
  ...over,
});

const asHost = () => ({ actorUserId: hostId, source: 'HOST' as const });
const reasonOf = (error: unknown) => (error as { extensions?: { reason?: string } }).extensions?.reason;

describe('a free pod says why it is free', () => {
  it("refuses a host's free pod without a justification, asking for an app update", async () => {
    const error = await podService.create(freeInput(), asHost()).catch((e: unknown) => e);
    expect(reasonOf(error)).toBe('FREE_JUSTIFICATION_REQUIRED');
    expect(await PodModel.countDocuments({ pod_type: 'FREE', pod_hosts_id: new Types.ObjectId(hostId) })).toBe(0);
  });

  it('refuses an incomplete justification, naming what is missing', async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ reason: 'CHARITY', accepted: true }, 'FREE_REASON_REQUIRED'],
      [{ reason: 'OTHER', details: ' ', accepted: true }, 'FREE_DETAILS_REQUIRED'],
      [{ reason: 'PROMOTIONAL', accepted: false }, 'FREE_POLICY_NOT_ACCEPTED'],
      [{ reason: 'CAMPAIGN', details: 'x'.repeat(301), accepted: true }, 'FREE_DETAILS_TOO_LONG'],
    ];
    for (const [justification, reason] of cases) {
      const error = await podService.create(freeInput({ free_justification: justification }), asHost()).catch((e: unknown) => e);
      expect(reasonOf(error)).toBe(reason);
    }
  });

  it('keeps the reason, the details and who accepted the policy when', async () => {
    const before = Date.now();
    const pod = await podService.create(
      freeInput({ free_justification: { reason: 'OTHER', details: '  Partner NGO  meet ', accepted: true } }),
      asHost()
    );
    const stored = await PodModel.findById(pod?.id).lean();
    expect(stored?.free_justification).toMatchObject({ reason: 'OTHER', details: 'Partner NGO meet' });
    expect(String(stored?.free_justification?.accepted_by)).toBe(hostId);
    expect(new Date(stored?.free_justification?.accepted_at ?? 0).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('lets staff make a pod free without one — they are audited by the pod log', async () => {
    const pod = await podService.create(freeInput(), { actorUserId: String(new Types.ObjectId()), source: 'ADMIN' });
    expect((await PodModel.findById(pod?.id).lean())?.free_justification ?? null).toBeNull();
  });

  it('keeps no justification on a paid pod, whatever the client sent', async () => {
    const pod = await podService.create(
      freeInput({ pod_type: 'PAID', pod_amount: 900, free_justification: { reason: 'CAMPAIGN', accepted: true } }),
      asHost()
    );
    expect((await PodModel.findById(pod?.id).lean())?.free_justification ?? null).toBeNull();
  });
});

describe('Free Arrangements table', () => {
  const venueFree = { reason: 'PROMOTIONAL', details: 'Launch week', accepted_at: new Date(), accepted_by: new Types.ObjectId() };

  async function seedPod(over: Record<string, unknown>) {
    return PodModel.create({
      pod_id: `free-${new Types.ObjectId().toString()}`,
      pod_title: 'Seeded pod',
      pod_hosts_id: [new Types.ObjectId(hostId)],
      club_id: new Types.ObjectId(),
      pod_description: 'Seeded',
      pod_date_time: new Date(inDays(3)),
      pod_type: 'PAID',
      pod_amount: 500,
      no_of_spots: 8,
      ...over,
    });
  }

  it('lists free pods and free venues with their justification, and nothing else', async () => {
    const freePod = await podService.create(freeInput({ free_justification: { reason: 'INITIATIVE', accepted: true } }), asHost());
    const freeVenue = await seedPod({ pod_title: 'Paid pod, free venue', venue_free_justification: venueFree });
    const both = await seedPod({ pod_title: 'Both free', pod_type: 'FREE', pod_amount: 0, venue_free_justification: venueFree });
    await seedPod({ pod_title: 'Plain paid pod' });

    const page = await podFreeArrangementsService.table({ page_size: 50 });
    const byId = new Map(page.rows.map((row) => [row.id, row]));
    expect(page.rows.some((row) => row.pod_title === 'Plain paid pod')).toBe(false);
    expect(byId.get(String(freePod?.id))).toMatchObject({
      kind: 'FREE_POD',
      host_name: 'Asha Rao',
      free_justification: { reason: 'INITIATIVE', details: '' },
      venue_free_justification: null,
      cancelled: false,
    });
    expect(byId.get(String(freeVenue._id))).toMatchObject({
      kind: 'FREE_VENUE',
      pod_type: 'PAID',
      venue_free_justification: { reason: 'PROMOTIONAL', details: 'Launch week' },
    });
    expect(byId.get(String(both._id))?.kind).toBe('BOTH');
  });

  it('filters by either justification\'s reason and searches the details', async () => {
    await seedPod({ pod_title: 'Promo venue', venue_free_justification: venueFree });
    await podService.create(freeInput({ free_justification: { reason: 'CAMPAIGN', accepted: true } }), asHost());

    const promotional = await podFreeArrangementsService.table({ filters: [{ field: 'reason', op: 'eq', value: 'PROMOTIONAL' }] });
    expect(promotional.rows.length).toBeGreaterThan(0);
    expect(promotional.rows.every((row) => row.venue_free_justification?.reason === 'PROMOTIONAL' || row.free_justification?.reason === 'PROMOTIONAL')).toBe(true);

    const searched = await podFreeArrangementsService.table({ search: 'Launch week' });
    expect(searched.rows.every((row) => row.venue_free_justification?.details === 'Launch week')).toBe(true);
  });

  it('keeps a cancelled free pod listed, marked cancelled', async () => {
    const cancelled = await seedPod({ pod_title: 'Cancelled free', pod_type: 'FREE', pod_amount: 0, deleted_at: new Date() });
    const page = await podFreeArrangementsService.table({ page_size: 100 });
    expect(page.rows.find((row) => row.id === String(cancelled._id))).toMatchObject({ cancelled: true, kind: 'FREE_POD' });
  });
});
