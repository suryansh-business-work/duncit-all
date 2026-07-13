import { Types } from 'mongoose';
import { coHostService } from '../../coHost.service';
import { podService } from '../../pod.service';
import { PodModel } from '../../pod.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';

const IMG = { url: 'https://cdn.example.com/pod.jpg', type: 'IMAGE' };

/** An approved, active host onboarded into `subId`. */
async function makeHost(subId: Types.ObjectId, name: string) {
  const user = await UserModel.create({
    auth: { email: `${name.toLowerCase()}@example.com` },
    profile: { first_name: name, last_name: 'Host' },
  });
  await HostModel.create({
    user_id: user._id,
    full_name: `${name} Host`,
    email: `${name.toLowerCase()}@example.com`,
    phone: '9990001111',
    status: 'APPROVED',
    is_active: true,
    host_categories: [{ sub_category_id: subId }],
  });
  return String(user._id);
}

/** A sub-category + a club that points at it (a pod inherits the club's). */
async function makeSubCategoryAndClub(over: { allow_co_hosts?: boolean; max_co_hosts?: number } = {}) {
  const superCat = await CategoryModel.create({ name: 'Sport', slug: 'sport', level: 'SUPER' });
  const cat = await CategoryModel.create({
    name: 'Running', slug: 'running', level: 'CATEGORY', parent_id: superCat._id,
  });
  const sub = await CategoryModel.create({
    name: 'Trail', slug: 'trail', level: 'SUB', parent_id: cat._id,
    allow_co_hosts: over.allow_co_hosts ?? true,
    max_co_hosts: over.max_co_hosts ?? 2,
  });
  const club = await ClubModel.create({
    club_id: `c-${Math.random().toString(36).slice(2)}`,
    club_name: 'Trail Club',
    category_id: sub._id, // club.category_id IS the sub level
    super_category_id: superCat._id,
  });
  return { sub, club };
}

const podInput = (hostId: string, clubId: string, over: Record<string, unknown> = {}) => ({
  pod_title: `Pod ${Math.random().toString(36).slice(2)}`,
  club_id: clubId,
  pod_hosts_id: [hostId],
  pod_mode: 'VIRTUAL',
  meeting_url: 'https://meet.example.com/x',
  pod_description: 'desc',
  pod_type: 'NATIVE_FREE',
  pod_date_time: new Date(Date.now() + 86_400_000).toISOString(),
  pod_images_and_videos: [IMG],
  ...over,
});

describe('co-hosting', () => {
  it('invites at create time, as PENDING — nobody co-hosts without accepting', async () => {
    const { sub, club } = await makeSubCategoryAndClub();
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');

    const pod = await podService.create(
      podInput(host, String(club._id), { co_host_user_ids: [mate] })
    );

    const doc = await PodModel.findById(pod!.id);
    expect(doc!.co_hosts).toHaveLength(1);
    expect(doc!.co_hosts[0].status).toBe('PENDING');
    expect(String(doc!.co_hosts[0].user_id)).toBe(mate);
    // The co-host is NOT a host: they must never gain delete/refund power.
    expect(doc!.pod_hosts_id.map(String)).toEqual([host]);
  });

  it('refuses co-hosts when the sub-category does not allow them', async () => {
    const { sub, club } = await makeSubCategoryAndClub({ allow_co_hosts: false });
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');

    await expect(
      podService.create(podInput(host, String(club._id), { co_host_user_ids: [mate] }))
    ).rejects.toThrow(/not enabled/i);
  });

  it('enforces the sub-category max_co_hosts cap', async () => {
    const { sub, club } = await makeSubCategoryAndClub({ max_co_hosts: 1 });
    const host = await makeHost(sub._id, 'Asha');
    const one = await makeHost(sub._id, 'Bala');
    const two = await makeHost(sub._id, 'Chitra');

    await expect(
      podService.create(podInput(host, String(club._id), { co_host_user_ids: [one, two] }))
    ).rejects.toThrow(/at most 1 co-host/i);
  });

  it('refuses a co-host who is not an approved host in the same sub-category', async () => {
    const { sub, club } = await makeSubCategoryAndClub();
    const host = await makeHost(sub._id, 'Asha');
    const outsider = await makeHost(new Types.ObjectId(), 'Deep'); // different sub-category

    await expect(
      podService.create(podInput(host, String(club._id), { co_host_user_ids: [outsider] }))
    ).rejects.toThrow(/approved host in the same category/i);
  });

  it('only the primary host may invite; a co-host cannot', async () => {
    const { sub, club } = await makeSubCategoryAndClub();
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');
    const third = await makeHost(sub._id, 'Chitra');
    const pod = await podService.create(podInput(host, String(club._id)));

    await coHostService.invite(pod!.id, host, mate);
    // The co-host is not a host, so they cannot invite anyone else.
    await expect(coHostService.invite(pod!.id, mate, third)).rejects.toThrow(/only the pod host/i);
  });

  it('accept/decline is the invitee’s call alone, and only once', async () => {
    const { sub, club } = await makeSubCategoryAndClub();
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');
    const pod = await podService.create(
      podInput(host, String(club._id), { co_host_user_ids: [mate] })
    );

    // Someone else cannot answer on their behalf.
    await expect(coHostService.respond(pod!.id, host, true)).rejects.toThrow(/not been invited/i);

    await coHostService.respond(pod!.id, mate, true);
    const doc = await PodModel.findById(pod!.id);
    expect(doc!.co_hosts[0].status).toBe('ACCEPTED');
    expect(doc!.co_hosts[0].responded_at).toBeTruthy();

    // No answering twice.
    await expect(coHostService.respond(pod!.id, mate, false)).rejects.toThrow(/already been answered/i);
  });

  it('a declined invite frees its slot and can be re-sent', async () => {
    const { sub, club } = await makeSubCategoryAndClub({ max_co_hosts: 1 });
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');
    const pod = await podService.create(
      podInput(host, String(club._id), { co_host_user_ids: [mate] })
    );

    await coHostService.respond(pod!.id, mate, false);
    let doc = await PodModel.findById(pod!.id);
    expect(doc!.co_hosts[0].status).toBe('DECLINED');

    // The cap is 1 and the declined entry must not still occupy it.
    await coHostService.invite(pod!.id, host, mate);
    doc = await PodModel.findById(pod!.id);
    expect(doc!.co_hosts).toHaveLength(1);
    expect(doc!.co_hosts[0].status).toBe('PENDING');
  });

  it('lists my co-hosted pods (accepted) and my pods that carry co-hosts', async () => {
    const { sub, club } = await makeSubCategoryAndClub();
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');
    const pod = await podService.create(
      podInput(host, String(club._id), { co_host_user_ids: [mate] })
    );

    // Still PENDING → not yet "co-hosting".
    expect(await coHostService.myCoHostedPods(mate, 'ACCEPTED')).toHaveLength(0);
    expect(await coHostService.myCoHostedPods(mate, 'PENDING')).toHaveLength(1);

    await coHostService.respond(pod!.id, mate, true);
    expect(await coHostService.myCoHostedPods(mate, 'ACCEPTED')).toHaveLength(1);

    // …and the primary host sees it under "pods with your co-hosts".
    const mine = await coHostService.myPodsWithCoHosts(host);
    expect(mine).toHaveLength(1);
    expect(String(mine[0]._id)).toBe(pod!.id);
    // The co-host does NOT own it.
    expect(await coHostService.myPodsWithCoHosts(mate)).toHaveLength(0);
  });

  it('offers only same-category approved hosts as candidates, never the caller', async () => {
    const { sub, club } = await makeSubCategoryAndClub();
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');
    await makeHost(new Types.ObjectId(), 'Outsider'); // different sub-category
    const pod = await podService.create(podInput(host, String(club._id)));

    const names = (
      await coHostService.candidates(host, { sub_category_id: String(sub._id), pod_doc_id: pod!.id })
    ).map((c) => c.user_id);

    expect(names).toContain(mate);
    expect(names).not.toContain(host); // never suggest yourself
    expect(names).toHaveLength(1); // the outsider is not offered
  });

  it('the host can withdraw an invite', async () => {
    const { sub, club } = await makeSubCategoryAndClub();
    const host = await makeHost(sub._id, 'Asha');
    const mate = await makeHost(sub._id, 'Bala');
    const pod = await podService.create(
      podInput(host, String(club._id), { co_host_user_ids: [mate] })
    );

    await coHostService.remove(pod!.id, host, mate);
    const doc = await PodModel.findById(pod!.id);
    expect(doc!.co_hosts).toHaveLength(0);
  });
});
