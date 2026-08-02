import { Types } from 'mongoose';
import { snapshotPod, diffSnapshots } from '../../podAudit.service';
import { PodAuditLogModel } from '../../podAudit.model';
import { coHostService } from '@modules/pods/pod/coHost.service';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';
import { notificationService } from '@modules/engagement/notification/notification.service';

const hostId = new Types.ObjectId().toString();

beforeEach(() => {
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('snapshotPod — array fields are diffed, not stringified', () => {
  it('summarises media, hashtags and hosts instead of [object Object]', () => {
    const before = snapshotPod({
      pod_title: 'A',
      pod_images_and_videos: [{ url: 'https://img/one.jpg', type: 'IMAGE' }],
      pod_hashtag: ['poetry'],
      pod_hosts_id: [hostId],
    });
    expect(before.pod_images_and_videos).toBe('https://img/one.jpg');
    expect(before.pod_hashtag).toBe('poetry');
    expect(before.pod_hosts_id).toBe(hostId);
    expect(before.pod_images_and_videos).not.toContain('[object Object]');

    // A swapped image is a real change — previously this diff was empty and
    // the whole audit entry was dropped as a no-op edit.
    const after = snapshotPod({
      pod_title: 'A',
      pod_images_and_videos: [{ url: 'https://img/two.jpg', type: 'IMAGE' }],
      pod_hashtag: ['poetry'],
      pod_hosts_id: [hostId],
    });
    expect(diffSnapshots(before, after)).toEqual([
      { field: 'pod_images_and_videos', from: 'https://img/one.jpg', to: 'https://img/two.jpg' },
    ]);
  });

  it('treats a missing/!array value as empty and an identical gallery as no change', () => {
    const bare = snapshotPod({ pod_title: 'A' });
    expect(bare.pod_images_and_videos).toBe('');
    expect(bare.pod_hashtag).toBe('');
    const notArray = snapshotPod({ pod_title: 'A', pod_images_and_videos: 'nonsense' });
    expect(notArray.pod_images_and_videos).toBe('');
    expect(diffSnapshots(bare, notArray)).toEqual([]);
    // Media entries without a url still summarise to a stable string.
    expect(snapshotPod({ pod_images_and_videos: [{}] }).pod_images_and_videos).toBe('');
  });
});

describe('co-host roster changes are audited', () => {
  const trailFor = (podId: unknown) =>
    PodAuditLogModel.find({ pod_id: podId }).sort({ created_at: 1, _id: 1 });

  async function seedCoHostablePod() {
    const rnd = Math.random().toString(36).slice(2);
    const superCat = await CategoryModel.create({
      name: 'Arts',
      slug: `arts-${rnd}`,
      level: 'SUPER',
    } as never);
    const cat = await CategoryModel.create({
      name: 'Writing',
      slug: `writing-${rnd}`,
      level: 'CATEGORY',
      parent_id: superCat._id,
    } as never);
    // The club's category_id IS the sub level, and a pod inherits it.
    const sub = await CategoryModel.create({
      name: 'Poetry',
      slug: `poetry-${rnd}`,
      level: 'SUB',
      parent_id: cat._id,
      allow_co_hosts: true,
      max_co_hosts: 3,
    } as never);
    const club = await ClubModel.create({
      club_id: `club-${rnd}`,
      club_name: 'Poets',
      category_id: sub._id,
      super_category_id: superCat._id,
    } as never);
    const invitee = await UserModel.create({
      auth: { email: `cohost-${rnd}@x.com` },
      profile: { first_name: 'Co', last_name: 'Host' },
    } as never);
    await HostModel.create({
      user_id: invitee._id,
      full_name: 'Co Host',
      email: `cohost-${rnd}@x.com`,
      status: 'APPROVED',
      host_categories: [{ sub_category_id: sub._id }],
    } as never);
    const pod = await PodModel.create({
      pod_id: `pod-${new Types.ObjectId().toString()}`,
      pod_title: 'Poetry evening',
      pod_hosts_id: [new Types.ObjectId(hostId)],
      club_id: club._id,
      pod_description: 'desc',
      pod_type: 'FREE',
      pod_mode: 'VIRTUAL',
      pod_date_time: new Date(Date.now() + 86_400_000),
      no_of_spots: 5,
    });
    return { pod, inviteeId: String(invitee._id) };
  }

  it('records invite, response and removal in the monitored trail', async () => {
    const { pod, inviteeId } = await seedCoHostablePod();
    const podId = String(pod._id);

    await coHostService.invite(podId, hostId, inviteeId);
    await coHostService.respond(podId, inviteeId, true);
    await coHostService.remove(podId, hostId, inviteeId);

    const trail = await trailFor(pod._id);
    expect(trail.map((e) => e.note)).toEqual([
      `Co-host invited (${inviteeId})`,
      'Co-host invite accepted',
      `Co-host removed (${inviteeId})`,
    ]);
    // Roster edits are UPDATEs with no field diff — they must still be kept.
    expect(trail.every((e) => e.action === 'UPDATE' && e.source === 'HOST')).toBe(true);
    expect(trail[0].changes).toEqual([]);
  });

  it('records a declined invite too', async () => {
    const { pod, inviteeId } = await seedCoHostablePod();
    const podId = String(pod._id);
    await coHostService.invite(podId, hostId, inviteeId);
    await coHostService.respond(podId, inviteeId, false);

    const trail = await trailFor(pod._id);
    expect(trail.map((e) => e.note)).toContain('Co-host invite declined');
  });
});
