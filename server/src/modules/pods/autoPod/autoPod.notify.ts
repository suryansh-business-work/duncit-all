import { Types } from 'mongoose';
import type { IAutoPod } from './autoPod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { logs } from '@observability/log';

/**
 * Where each role acts. These three paths are deliberately the only ones an
 * Auto Pod notification ever carries, and each is registered on ALL THREE link
 * consumers — the mWeb router, the mWeb service worker (via meta-routes) and
 * native's `resolveNotificationLink` allow-list. A path missing from any one of
 * them makes the notification tap silently do nothing there.
 */
export const AUTO_POD_LINKS = {
  venue: '/venues/auto-pods',
  host: '/host/auto-pods',
  club: '/clubs/auto-pods',
} as const;

/** Every title carries "Auto Pod" so the clients' title-keyword categoriser
 * files these under the existing pod/approval buckets rather than inventing a
 * notification type the model does not have. */
async function push(
  userIds: string[],
  title: string,
  body: string,
  linkUrl: string
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  const { notificationService } = await import(
    '@modules/engagement/notification/notification.service'
  );
  await notificationService.create({
    title,
    body,
    scope: 'USER',
    target_user_ids: unique,
    link_url: linkUrl,
    silent: false,
  });
}

/** Owners of every approved, active venue — the audience for an open offer. */
async function approvedVenueOwnerIds(): Promise<string[]> {
  const ids = await VenueModel.distinct('owner_user_id', {
    status: 'APPROVED',
    is_active: true,
  });
  return ids.map(String);
}

/** Approved, active hosts onboarded into this sub-category. */
async function hostIdsForSubCategory(subCategoryId: Types.ObjectId): Promise<string[]> {
  const hosts = await HostModel.find({
    status: 'APPROVED',
    is_active: true,
    'host_categories.sub_category_id': subCategoryId,
  }).select('user_id');
  return hosts.map((h: any) => String(h.user_id));
}

/** Admins of active clubs carrying this sub-category. */
async function clubAdminIdsForSubCategory(subCategoryId: Types.ObjectId): Promise<string[]> {
  const clubs = await ClubModel.find({ category_id: subCategoryId, is_active: true }).select(
    'admin_user_ids'
  );
  return clubs.flatMap((c: any) => (c.admin_user_ids ?? []).map(String));
}

/** Everyone who has enrolled so far, plus the admin who opened it. */
function claimantIds(doc: IAutoPod): string[] {
  return [
    doc.created_by ? String(doc.created_by) : '',
    doc.venue_claim ? String(doc.venue_claim.owner_user_id) : '',
    doc.host_claim ? String(doc.host_claim.user_id) : '',
    doc.club_claim ? String(doc.club_claim.user_id) : '',
  ].filter(Boolean);
}

const whenLabel = (value?: Date | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

export const autoPodNotify = {
  /** A new offer is on the table — every approved venue may take it. */
  async opened(doc: IAutoPod) {
    await push(
      await approvedVenueOwnerIds(),
      'New Auto Pod for your venue',
      `"${doc.pod_title}" is open for any venue to accept. Pick a slot to take it.`,
      AUTO_POD_LINKS.venue
    );
  },

  /** A venue enrolled: hosts and club admins can now act, in parallel. */
  async venueEnrolled(doc: IAutoPod) {
    const when = whenLabel(doc.venue_claim?.pod_date_time);
    const [hosts, clubAdmins] = await Promise.all([
      hostIdsForSubCategory(doc.sub_category_id),
      clubAdminIdsForSubCategory(doc.sub_category_id),
    ]);
    await Promise.all([
      push(
        hosts,
        'Auto Pod needs a host',
        `"${doc.pod_title}" is booked at ${doc.venue_claim?.venue_name} on ${when}. Assign yourself to host it.`,
        AUTO_POD_LINKS.host
      ),
      push(
        clubAdmins,
        'Auto Pod needs a club',
        `"${doc.pod_title}" is booked at ${doc.venue_claim?.venue_name} on ${when}. Claim it for your club.`,
        AUTO_POD_LINKS.club
      ),
      push(
        doc.created_by ? [String(doc.created_by)] : [],
        'Auto Pod accepted by a venue',
        `${doc.venue_claim?.venue_name} accepted "${doc.pod_title}" for ${when}.`,
        AUTO_POD_LINKS.venue
      ),
    ]);
  },

  async hostEnrolled(doc: IAutoPod) {
    await push(
      [
        doc.created_by ? String(doc.created_by) : '',
        doc.venue_claim ? String(doc.venue_claim.owner_user_id) : '',
      ].filter(Boolean),
      'Auto Pod has a host',
      `${doc.host_claim?.host_name} will host "${doc.pod_title}".`,
      AUTO_POD_LINKS.venue
    );
  },

  async clubEnrolled(doc: IAutoPod) {
    await push(
      [
        doc.created_by ? String(doc.created_by) : '',
        doc.venue_claim ? String(doc.venue_claim.owner_user_id) : '',
      ].filter(Boolean),
      'Auto Pod claimed by a club',
      `${doc.club_claim?.club_name} claimed "${doc.pod_title}".`,
      AUTO_POD_LINKS.venue
    );
  },

  /** It is a real pod now — everyone involved gets the pod's own link. */
  async live(doc: IAutoPod) {
    let link: string | null = null;
    if (doc.pod_id) {
      const { podNotificationLink, loadPodClubSlugMap } = await import(
        '@modules/pods/pod/pod.service'
      );
      const pod = await PodModel.findById(doc.pod_id);
      if (pod) link = podNotificationLink(pod, await loadPodClubSlugMap([pod]));
    }
    await push(
      claimantIds(doc),
      'Auto Pod is live',
      `"${doc.pod_title}" is now live and open for bookings.`,
      link ?? AUTO_POD_LINKS.host
    );
  },

  async cancelled(doc: IAutoPod) {
    const reason = doc.cancel_reason ? ` Reason: ${doc.cancel_reason}` : '';
    await push(
      claimantIds(doc),
      'Auto Pod cancelled',
      `"${doc.pod_title}" was cancelled before it went live.${reason}`,
      AUTO_POD_LINKS.venue
    );
  },

  async expired(doc: IAutoPod) {
    await push(
      claimantIds(doc),
      'Auto Pod expired',
      `"${doc.pod_title}" expired because its date passed before everyone enrolled.`,
      AUTO_POD_LINKS.venue
    );
  },
};

/** Fire-and-forget wrapper for callers that must never fail on a notification. */
export function notifyQuietly(promise: Promise<void>, component: string, autoPodId: string) {
  promise.catch((error) =>
    logs.server.error('autoPod', component, { error, auto_pod_id: autoPodId })
  );
}
