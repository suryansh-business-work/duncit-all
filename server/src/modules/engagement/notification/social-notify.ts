import { Types } from 'mongoose';

/**
 * "Somebody engaged with something you made" — the one place that turns a like
 * or a comment into an in-app notification for the thing's owner.
 *
 * This started life as a private helper inside post.service.ts. Pods, pod
 * comments and pod ideas all need the identical notification, which would have
 * made it a fifth copy of the same twelve lines (rules 34/40), so it moved here
 * next to the service it drives. The wording is unchanged from the post version,
 * so existing post notifications read exactly as they did before.
 *
 * It lives beside notification.service.ts rather than in @utils because its
 * whole job is to call notificationService and userService — parking it in the
 * leaf-helper folder would invert the layering. The service imports stay lazy
 * (the pattern every other producer uses) so a producer module can import this
 * one statically without dragging the notification service into its cycle.
 *
 * Callers fire-and-forget: a notification that fails must never fail the like
 * or comment that triggered it. Likes notify only on the transition to liked,
 * which is the callers' job — an unlike is not news.
 */

/** Reads verbatim in the copy: "New like on your pod comment". */
export type SocialSubject = 'post' | 'pod' | 'pod comment' | 'pod idea';
export type SocialAction = 'liked' | 'commented on';

export async function notifySocialActivity(opts: {
  /** Who owns the liked/commented thing. */
  ownerId: string;
  /** Who did the liking/commenting — never notified about their own action. */
  actorId: string;
  subject: SocialSubject;
  action: SocialAction;
  /** Deep link to the thing, or null when the surface has no route for it. */
  link: string | null;
}) {
  const { ownerId, actorId, subject, action, link } = opts;
  // An owner id can be absent (a pod with no host yet) or a stray value — a bad
  // id must not become a notification addressed to nobody.
  if (!ownerId || !Types.ObjectId.isValid(ownerId) || ownerId === actorId) return;

  const { userService } = await import('@modules/access/user/user.service');
  const { notificationService } = await import('./notification.service');
  const actor = await userService.getById(actorId).catch(() => null);
  const name = actor?.full_name?.trim() || 'Someone';

  await notificationService.create({
    title: `New ${action === 'liked' ? 'like' : 'comment'} on your ${subject}`,
    body: `${name} ${action} your ${subject}`,
    image_url: actor?.profile_photo ?? null,
    link_url: link,
    scope: 'USER',
    target_user_ids: [ownerId],
  });
}
