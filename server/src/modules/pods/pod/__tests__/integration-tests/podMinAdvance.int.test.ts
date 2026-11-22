/**
 * Minimum Advance Days for Pod Creation: a host's new pod must start at least
 * N calendar days after today (app zone). N = the host's override from the
 * Hosts console, else Pod Settings (default 2). Admin pods are not held to it.
 */
import { Types } from 'mongoose';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { assertPodMinAdvance, podMinAdvanceDaysFor, podMinAdvanceWindow } from '../../pod.minAdvance';
import { HostModel } from '@modules/venues/host/host.model';
import { hostService } from '@modules/venues/host/host.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { notificationService } from '@modules/engagement/notification/notification.service';

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };
// 10 Nov 2026, 14:00 in Kolkata (the app zone's default).
const NOV_10 = new Date('2026-11-10T08:30:00.000Z');

const reasonOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: { extensions?: { reason?: string; code?: string } }) => error.extensions?.reason ?? error.extensions?.code,
  );

async function seedHost(over: Record<string, unknown> = {}) {
  const userId = new Types.ObjectId();
  const host = await HostModel.create({ user_id: userId, status: 'APPROVED', is_active: true, ...over });
  return { userId: String(userId), hostDocId: String(host._id) };
}

const virtualInput = (start: string, over: Record<string, unknown> = {}) => ({
  pod_title: `Advance pod ${Math.random().toString(36).slice(2)}`,
  club_id: String(new Types.ObjectId()),
  pod_mode: 'VIRTUAL',
  meeting_url: 'https://meet.example.com/x',
  pod_description: 'A virtual pod held to the advance rule',
  pod_type: 'PAID',
  pod_amount: 1000,
  no_of_spots: 2,
  pod_date_time: start,
  pod_end_date_time: new Date(Date.parse(start) + 2 * 3_600_000).toISOString(),
  pod_images_and_videos: [IMG],
  ...over,
});

beforeEach(() => {
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('podMinAdvanceWindow', () => {
  it('opens N calendar days after today, from midnight in the app zone (10 Nov + 5 → 15 Nov)', () => {
    const window = podMinAdvanceWindow(5, NOV_10);
    expect(window.day).toBe('2026-11-15');
    expect(window.start.toISOString()).toBe('2026-11-14T18:30:00.000Z');
  });

  it('holds an out-of-range count to 1–30', () => {
    expect(podMinAdvanceWindow(0, NOV_10).day).toBe('2026-11-11');
    expect(podMinAdvanceWindow(45, NOV_10).day).toBe('2026-12-10');
  });
});

describe('podMinAdvanceDaysFor', () => {
  it('is the platform default of 2 for a host with no override, and for a non-host', async () => {
    const { userId } = await seedHost();
    await expect(podMinAdvanceDaysFor(userId)).resolves.toBe(2);
    await expect(podMinAdvanceDaysFor(String(new Types.ObjectId()))).resolves.toBe(2);
    await expect(podMinAdvanceDaysFor('not-an-id')).resolves.toBe(2);
  });

  it('follows Pod Settings when the host has no override', async () => {
    const { userId } = await seedHost();
    await settingsService.updateAppSettings({ pod_min_advance_days: 7 });
    await expect(podMinAdvanceDaysFor(userId)).resolves.toBe(7);
  });

  it('prefers the host’s own override, and falls back again once it is cleared', async () => {
    const { userId, hostDocId } = await seedHost();
    await settingsService.updateAppSettings({ pod_min_advance_days: 7 });
    await hostService.setPodMinAdvanceDaysOverride(hostDocId, 1);
    await expect(podMinAdvanceDaysFor(userId)).resolves.toBe(1);
    await hostService.setPodMinAdvanceDaysOverride(hostDocId, null);
    await expect(podMinAdvanceDaysFor(userId)).resolves.toBe(7);
  });
});

describe('assertPodMinAdvance', () => {
  it('refuses a start before the first allowed midnight, naming the days and the day', async () => {
    const { userId } = await seedHost({ pod_min_advance_days_override: 5 });
    const error = await assertPodMinAdvance(userId, '2026-11-14T18:29:00.000Z', NOV_10).catch((e: unknown) => e);
    expect(error).toMatchObject({
      message: 'You can only create a Pod scheduled at least 5 days in advance from the current date.',
      extensions: { code: 'BAD_USER_INPUT', reason: 'POD_MIN_ADVANCE', min_advance_days: 5, earliest_day: '2026-11-15' },
    });
  });

  it('accepts a start exactly at the first allowed midnight', async () => {
    const { userId } = await seedHost({ pod_min_advance_days_override: 5 });
    await expect(assertPodMinAdvance(userId, '2026-11-14T18:30:00.000Z', NOV_10)).resolves.toBeUndefined();
  });

  it('says "1 day", not "1 days"', async () => {
    const { userId } = await seedHost({ pod_min_advance_days_override: 1 });
    await expect(assertPodMinAdvance(userId, '2026-11-10T15:00:00.000Z', NOV_10)).rejects.toThrow(
      'at least 1 day in advance',
    );
  });

  it('leaves a missing or unparseable start to the date validator', async () => {
    const { userId } = await seedHost();
    for (const start of [undefined, null, '', 'not a date']) {
      await expect(assertPodMinAdvance(userId, start, NOV_10)).resolves.toBeUndefined();
    }
  });
});

describe('createForPartner', () => {
  it('refuses a host’s pod tomorrow under the default of 2 days, and writes nothing', async () => {
    const { userId } = await seedHost();
    expect(await reasonOf(podService.createForPartner(userId, virtualInput(inDays(1))))).toBe('POD_MIN_ADVANCE');
    expect(await PodModel.countDocuments({ pod_hosts_id: new Types.ObjectId(userId) })).toBe(0);
  });

  it('creates the pod once it starts on or after the first allowed day', async () => {
    const { userId } = await seedHost();
    const pod = await podService.createForPartner(userId, virtualInput(inDays(3)));
    expect(pod?.pod_hosts_id?.map(String)).toEqual([userId]);
  });

  it('lets a host with an override of 1 create a pod tomorrow', async () => {
    const { userId } = await seedHost({ pod_min_advance_days_override: 1 });
    await expect(podService.createForPartner(userId, virtualInput(inDays(1)))).resolves.toBeTruthy();
  });

  it('does not hold an admin-created pod to the rule', async () => {
    const { userId } = await seedHost();
    const pod = await podService.create(virtualInput(inDays(1), { pod_hosts_id: [userId] }));
    expect(pod?.pod_amount).toBe(1000);
  });
});

describe('hostResubmit', () => {
  async function seedDeclinedPod(hostUserId: string) {
    return PodModel.create({
      pod_id: `pod-${new Types.ObjectId().toString()}`,
      pod_title: 'Poetry evening',
      pod_hosts_id: [new Types.ObjectId(hostUserId)],
      club_id: new Types.ObjectId(),
      location_id: new Types.ObjectId(),
      pod_description: 'An evening of poetry and calm conversations',
      pod_date_time: new Date(inDays(1.5)),
      pod_type: 'PAID',
      pod_amount: 500,
      no_of_spots: 5,
      pod_images_and_videos: [IMG],
      is_active: false,
      venue_approval_status: 'DECLINED',
      venue_slot_id: null,
      venue_id: new Types.ObjectId(),
    });
  }

  const asVirtual = (over: Record<string, unknown> = {}) => ({
    pod_mode: 'VIRTUAL',
    meeting_platform: 'Zoom',
    meeting_url: 'https://zoom.us/j/123',
    pod_end_date_time: inDays(4.1),
    ...over,
  });

  it('refuses a move to a date inside the window', async () => {
    const { userId } = await seedHost();
    const pod = await seedDeclinedPod(userId);
    // 12 hours out is today or tomorrow whatever the time of day — always inside 2 days.
    const move = asVirtual({ pod_date_time: inDays(0.5), pod_end_date_time: inDays(0.6) });
    expect(await reasonOf(podService.hostResubmit(String(pod._id), userId, move))).toBe('POD_MIN_ADVANCE');
    expect((await PodModel.findById(pod._id))?.venue_approval_status).toBe('DECLINED');
  });

  it('accepts a move to a date past the window', async () => {
    const { userId } = await seedHost();
    const pod = await seedDeclinedPod(userId);
    const res = await podService.hostResubmit(String(pod._id), userId, asVirtual({ pod_date_time: inDays(4) }));
    expect(res?.is_active).toBe(true);
  });

  it('keeps the date the venue already saw, even though it is now inside the window', async () => {
    const { userId } = await seedHost();
    const pod = await seedDeclinedPod(userId);
    const res = await podService.hostResubmit(
      String(pod._id),
      userId,
      asVirtual({ pod_date_time: pod.pod_date_time.toISOString(), pod_end_date_time: inDays(1.6) }),
    );
    expect(res?.venue_approval_status).toBe('NONE');
  });
});
