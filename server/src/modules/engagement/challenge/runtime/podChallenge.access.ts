import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { hasRole } from '@middleware/rbac';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { VIEWABLE_STATUSES, type ChallengeStatus } from './challenge.lifecycle';

/**
 * Who may do what with a pod challenge. Every rule is decided here, on the
 * server, from the database — a shared link carries no authority of its own:
 *
 *  - MANAGE: the pod's hosts, and Challenge Portal staff.
 *  - INTERACT (vote/rate): a confirmed attendee (PodMember JOINED) while the
 *    challenge is live and audience interaction is on.
 *  - JUDGE: a user the host assigned as judge, while live.
 *  - VIEW: managers always; anyone else only for an enabled, non-draft
 *    challenge that is shown on Pod Details, or that they attend or judge.
 */

export const CHALLENGE_STAFF = ['SUPER_ADMIN', 'CHALLENGE_MANAGER'] as const;

export interface PodRef {
  _id: Types.ObjectId;
  pod_title: string;
  pod_hosts_id: Types.ObjectId[];
  club_id: Types.ObjectId | null;
  pod_attendees: Types.ObjectId[];
}

export interface ChallengeAccess {
  isStaff: boolean;
  isHost: boolean;
  isAttendee: boolean;
  canManage: boolean;
}

function forbidden(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
}

export async function loadPod(podId: string): Promise<PodRef> {
  if (!Types.ObjectId.isValid(podId)) {
    throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const pod = await PodModel.findById(podId).select('pod_title pod_hosts_id club_id pod_attendees').lean();
  if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
  return pod as unknown as PodRef;
}

export async function accessFor(user: AuthUser | null, pod: PodRef): Promise<ChallengeAccess> {
  if (!user) return { isStaff: false, isHost: false, isAttendee: false, canManage: false };
  const isStaff = hasRole(user, CHALLENGE_STAFF);
  const isHost = (pod.pod_hosts_id ?? []).some((id) => id.toString() === user.id);
  const isAttendee = !!(await PodMemberModel.exists({ pod_id: pod._id, user_id: user.id, status: 'JOINED' }));
  return { isStaff, isHost, isAttendee, canManage: isStaff || isHost };
}

export function assertManage(access: ChallengeAccess) {
  if (!access.canManage) forbidden('Only the pod host can manage this challenge');
}

interface ViewableChallenge {
  status: string;
  enabled: boolean;
  show_on_pod_details: boolean;
  judge_user_ids?: Types.ObjectId[] | null;
}

export function isJudge(challenge: ViewableChallenge, userId: string | undefined): boolean {
  return !!userId && (challenge.judge_user_ids ?? []).some((id) => id.toString() === userId);
}

export function canView(challenge: ViewableChallenge, access: ChallengeAccess, userId?: string): boolean {
  if (access.canManage) return true;
  if (!challenge.enabled || !VIEWABLE_STATUSES.includes(challenge.status as ChallengeStatus)) return false;
  return challenge.show_on_pod_details || access.isAttendee || isJudge(challenge, userId);
}

export function assertView(challenge: ViewableChallenge, access: ChallengeAccess, userId?: string) {
  // Same answer as "does not exist": a hidden challenge's id reveals nothing.
  if (!canView(challenge, access, userId)) {
    throw new GraphQLError('Challenge not found', { extensions: { code: 'NOT_FOUND' } });
  }
}
