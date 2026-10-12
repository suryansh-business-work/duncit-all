/**
 * `podService` — hiding a pod and showing it again, and who may still open a
 * hidden one. What "hidden" means is in utils/hidden.ts. Composed into
 * `podService` in pod.service.ts.
 */
import { Types } from 'mongoose';
import { PodModel } from './pod.model';
import { podAuditService } from '@modules/pods/podAudit/podAudit.service';
import { hideReasonFor, isPodHidden } from '@utils/hidden';
import { loadClubSlugMap, notFound, toPub } from './pod.shared';

const sameId = (userId: string) => (id: unknown) => String(id) === userId;

/**
 * Whether a hidden pod may still be opened by this person.
 *
 * Hiding stops a pod being OFFERED; it does not take it away from the people
 * already in it. Someone holding a ticket still needs the page their ticket
 * points at, and the host still has a pod to run — so the people on the pod
 * read it as before, and to everyone else it is simply not there.
 */
export function mayOpenHiddenPod(
  pod: { pod_hosts_id?: unknown[]; pod_attendees?: unknown[]; co_hosts?: { user_id: unknown }[] },
  userId: string | null | undefined
): boolean {
  if (!userId) return false;
  const mine = sameId(userId);
  return (
    (pod.pod_hosts_id ?? []).some(mine) ||
    (pod.pod_attendees ?? []).some(mine) ||
    (pod.co_hosts ?? []).some((c) => mine(c.user_id))
  );
}

/** A pod as one reader may see it: itself, or null when it is hidden from them. */
export function podVisibleTo<T extends Parameters<typeof mayOpenHiddenPod>[0] & Parameters<typeof isPodHidden>[0]>(
  pod: T | null,
  reader: { userId?: string | null; seesHidden: boolean }
): T | null {
  if (!pod || !isPodHidden(pod) || reader.seesHidden) return pod;
  return mayOpenHiddenPod(pod, reader.userId) ? pod : null;
}

export const podVisibilityMethods = {
  /**
   * Hide a pod from every member-facing surface, or show it again.
   *
   * Sets a state rather than toggling it, so a double-click or a retry lands
   * on the same answer. Only the pod's OWN flag moves: a pod hidden with its
   * club stays hidden until the club is shown, whatever is done here.
   */
  async setHidden(
    id: string,
    hidden: boolean,
    reason: string | null | undefined,
    actorUserId: string
  ) {
    const hiddenReason = hideReasonFor(hidden, reason);
    if (!Types.ObjectId.isValid(id)) notFound();
    // A cancelled pod can be hidden too — it is still listed in the consoles.
    const before = await PodModel.findById(id).setOptions({ includeDeleted: true }).select('is_hidden');
    if (!before) notFound();
    const doc = await PodModel.findOneAndUpdate(
      { _id: before._id },
      {
        $set: {
          is_hidden: hidden,
          hidden_reason: hiddenReason,
          hidden_at: hidden ? new Date() : null,
          hidden_by: hidden && Types.ObjectId.isValid(actorUserId) ? new Types.ObjectId(actorUserId) : null,
        },
      },
      { new: true }
    ).setOptions({ includeDeleted: true });
    if (!doc) notFound();
    await podAuditService.record({
      pod: doc,
      action: 'UPDATE',
      source: 'ADMIN',
      actorUserId,
      note: hiddenReason,
      changes: [{ field: 'is_hidden', from: String(!!before.is_hidden), to: String(hidden) }],
    });
    const slugMap = await loadClubSlugMap([doc]);
    return toPub(doc, slugMap);
  },
};
