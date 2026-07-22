import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel, type CoHostStatus, type IPod } from './pod.model';

/**
 * Co-hosting.
 *
 * A co-host is a second host invited to help run someone else's pod. Three
 * things are deliberately true and must stay true:
 *
 *  1. A co-host is VIEW-ONLY. They are stored in `pod.co_hosts`, never in
 *     `pod_hosts_id` — membership of that array is what authorises
 *     hostUpdatePod / hostDeletePod / addPodStatus, so a co-host placed there
 *     could delete the pod and trigger attendee refunds.
 *  2. Money is untouched. The primary host still receives 100% of host_receives;
 *     nothing here goes near the settlement engine.
 *  3. Nobody is added without consent. An invite lands as PENDING and only
 *     becomes ACCEPTED when the invitee says so.
 *
 * Whether co-hosting is available at all — and how many co-hosts a pod may
 * carry — is configured by an admin on the SUB-category
 * (`allow_co_hosts` / `max_co_hosts`).
 */

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

function forbidden(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

function notFound(message = 'Pod not found'): never {
  throw new GraphQLError(message, { extensions: { code: 'NOT_FOUND' } });
}

/** Only a real host of the pod may manage its co-hosts — never a co-host. */
async function findOwnedPod(podId: string, userId: string) {
  if (!Types.ObjectId.isValid(podId)) bad('Invalid pod id');
  const doc = await PodModel.findById(podId);
  if (!doc) notFound();
  const isHost = (doc.pod_hosts_id ?? []).some((id) => String(id) === userId);
  if (!isHost) forbidden('Only the pod host can manage co-hosts');
  return doc;
}

/**
 * The pod's sub-category. A Pod has no category of its own — it inherits the
 * club's, where `club.category_id` IS the sub level (see club.model).
 */
export async function subCategoryIdOfPod(pod: Pick<IPod, 'club_id'>): Promise<string | null> {
  const club = await ClubModel.findById(pod.club_id).select('category_id');
  return club?.category_id ? String(club.category_id) : null;
}

/** The co-host policy for a sub-category. Absent/!allow => co-hosting is off. */
export async function coHostPolicy(subCategoryId: string | null) {
  if (!subCategoryId || !Types.ObjectId.isValid(subCategoryId)) {
    return { allowed: false, max: 0 };
  }
  const cat = await CategoryModel.findById(subCategoryId).select('allow_co_hosts max_co_hosts level');
  if (!cat?.allow_co_hosts) return { allowed: false, max: 0 };
  return { allowed: true, max: cat.max_co_hosts ?? 1 };
}

/** Co-hosts that still count against the cap — a DECLINED one frees its slot. */
const activeCoHosts = (pod: IPod) =>
  (pod.co_hosts ?? []).filter((c) => c.status !== 'DECLINED');

/**
 * Validate a set of co-host invites for a pod, then return the ids to store.
 * Used by both createPod and inviteCoHost so the rules cannot drift apart.
 */
export async function assertInvitable(
  pod: Pick<IPod, 'club_id' | 'pod_hosts_id' | 'co_hosts'>,
  candidateIds: string[],
  existingActive: number
) {
  const subId = await subCategoryIdOfPod(pod);
  const policy = await coHostPolicy(subId);
  if (!policy.allowed) bad('Co-hosting is not enabled for this sub-category');

  const hostIds = new Set((pod.pod_hosts_id ?? []).map(String));
  const unique = [...new Set(candidateIds.map(String))];

  for (const id of unique) {
    if (!Types.ObjectId.isValid(id)) bad('Invalid co-host id');
    if (hostIds.has(id)) bad('A host of the pod cannot also be its co-host');
  }

  if (existingActive + unique.length > policy.max) {
    bad(`This sub-category allows at most ${policy.max} co-host(s)`);
  }

  // Every co-host must themselves be an approved host in the SAME sub-category.
  const approved = await approvedHostUserIdsInSubCategory(subId!);
  for (const id of unique) {
    if (!approved.has(id)) bad('A co-host must be an approved host in the same category');
  }
  return unique;
}

/** User ids of approved, active hosts onboarded into this sub-category. */
async function approvedHostUserIdsInSubCategory(subCategoryId: string): Promise<Set<string>> {
  const hosts = await HostModel.find({
    status: 'APPROVED',
    is_active: true,
    'host_categories.sub_category_id': new Types.ObjectId(subCategoryId),
  }).select('user_id');
  return new Set(hosts.map((h: any) => String(h.user_id)));
}

/** Fire-and-forget in-app notification; a failure must never fail the mutation. */
async function notify(userIds: string[], title: string, body: string) {
  if (!userIds.length) return;
  try {
    const { notificationService } = await import(
      '@modules/engagement/notification/notification.service'
    );
    await notificationService.create({
      title,
      body,
      scope: 'USER',
      target_user_ids: userIds,
      silent: false,
    });
  } catch (err) {
    logs.server.error('coHost', 'notify', { error: err, msg: 'notification failed' });
  }
}

export const coHostService = {
  /**
   * Hosts in the same sub-category who may be invited. Returns ONLY id/name/photo
   * — never the Host document, which carries aadhar/PAN/bank details.
   */
  async candidates(
    userId: string,
    args: { sub_category_id: string; search?: string | null; pod_doc_id?: string | null }
  ) {
    const policy = await coHostPolicy(args.sub_category_id);
    if (!policy.allowed) return [];

    const approved = await approvedHostUserIdsInSubCategory(args.sub_category_id);
    approved.delete(userId); // never suggest yourself

    if (args.pod_doc_id && Types.ObjectId.isValid(args.pod_doc_id)) {
      const pod = await PodModel.findById(args.pod_doc_id).select('co_hosts pod_hosts_id');
      for (const c of pod?.co_hosts ?? []) {
        if (c.status !== 'DECLINED') approved.delete(String(c.user_id));
      }
      for (const h of pod?.pod_hosts_id ?? []) approved.delete(String(h));
    }
    if (!approved.size) return [];

    const q: any = { _id: { $in: [...approved].map((id) => new Types.ObjectId(id)) } };
    const users = await UserModel.find(q)
      .select('profile.first_name profile.last_name profile.profile_photo')
      .limit(50);

    const search = (args.search ?? '').trim().toLowerCase();
    return users
      .map((u: any) => ({
        user_id: String(u._id),
        name: [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ').trim(),
        profile_photo: u.profile?.profile_photo ?? null,
      }))
      .filter((c) => !search || c.name.toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /** Primary host invites a co-host. */
  async invite(podId: string, userId: string, inviteeId: string) {
    const pod = await findOwnedPod(podId, userId);
    const already = (pod.co_hosts ?? []).find((c) => String(c.user_id) === String(inviteeId));
    if (already && already.status !== 'DECLINED') {
      bad('That host has already been invited');
    }
    await assertInvitable(pod, [inviteeId], activeCoHosts(pod).length);

    // A previously-declined invite is re-opened rather than duplicated.
    if (already) {
      already.status = 'PENDING';
      already.invited_at = new Date();
      already.responded_at = null;
    } else {
      pod.co_hosts.push({
        user_id: new Types.ObjectId(inviteeId),
        status: 'PENDING',
        invited_at: new Date(),
        responded_at: null,
      } as any);
    }
    await pod.save();
    await notify(
      [String(inviteeId)],
      'Co-host invite',
      `You've been invited to co-host "${pod.pod_title}".`
    );
    return pod;
  },

  /** Primary host withdraws an invite / removes a co-host. */
  async remove(podId: string, userId: string, coHostId: string) {
    const pod = await findOwnedPod(podId, userId);
    const before = (pod.co_hosts ?? []).length;
    pod.co_hosts = (pod.co_hosts ?? []).filter(
      (c) => String(c.user_id) !== String(coHostId)
    ) as any;
    if (pod.co_hosts.length === before) notFound('That co-host is not on this pod');
    await pod.save();
    return pod;
  },

  /** The invitee accepts or declines. Only they may answer. */
  async respond(podId: string, userId: string, accept: boolean) {
    if (!Types.ObjectId.isValid(podId)) bad('Invalid pod id');
    const pod = await PodModel.findById(podId);
    if (!pod) notFound();

    const entry = (pod.co_hosts ?? []).find((c) => String(c.user_id) === userId);
    if (!entry) forbidden('You have not been invited to co-host this pod');
    if (entry.status !== 'PENDING') bad('This invite has already been answered');

    entry.status = accept ? 'ACCEPTED' : 'DECLINED';
    entry.responded_at = new Date();
    await pod.save();

    const user = await UserModel.findById(userId).select('profile.first_name profile.last_name');
    const who =
      [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ').trim() ||
      'A host';
    await notify(
      (pod.pod_hosts_id ?? []).map(String),
      accept ? 'Co-host accepted' : 'Co-host declined',
      `${who} ${accept ? 'accepted' : 'declined'} your invite to co-host "${pod.pod_title}".`
    );
    return pod;
  },

  /** Pods where I am a co-host (ACCEPTED by default; PENDING = my open invites). */
  async myCoHostedPods(userId: string, status: CoHostStatus = 'ACCEPTED') {
    return PodModel.find({
      co_hosts: { $elemMatch: { user_id: new Types.ObjectId(userId), status } },
      is_active: true,
    }).sort({ pod_date_time: -1 });
  },

  /** My own pods that carry at least one co-host (invited or accepted). */
  async myPodsWithCoHosts(userId: string) {
    return PodModel.find({
      pod_hosts_id: new Types.ObjectId(userId),
      co_hosts: { $elemMatch: { status: { $ne: 'DECLINED' } } },
      is_active: true,
    }).sort({ pod_date_time: -1 });
  },
};
