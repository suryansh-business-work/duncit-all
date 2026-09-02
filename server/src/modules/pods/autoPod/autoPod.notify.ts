import type { IAutoPod } from './autoPod.model';
import { autoPodCityLabel } from './autoPod.location';
import { audienceClubs, audienceHosts, audienceVenues } from './autoPod.audience';
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

type Role = keyof typeof AUTO_POD_LINKS;

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

/**
 * Who each missing role's push goes to. The audience module owns the matching
 * rule (sub-category, plus the pinned city for venues and clubs); this only
 * reduces its rows to user ids.
 */
async function venueOwnerIds(doc: IAutoPod): Promise<string[]> {
  const venues = await audienceVenues(doc.sub_category_id, doc.location);
  return venues.map((venue) => venue.owner_user_id);
}

async function hostIds(doc: IAutoPod): Promise<string[]> {
  const hosts = await audienceHosts(doc.sub_category_id);
  return hosts.map((host) => host.user_id);
}

async function clubAdminIds(doc: IAutoPod): Promise<string[]> {
  const clubs = await audienceClubs(doc.sub_category_id, doc.location);
  return clubs.flatMap((club) => club.admin_user_ids);
}

/**
 * Everyone with a stake in the offer, each with the page THEY act from: the
 * venue owner's venue queue, the host's host queue, the claiming club admin's
 * club queue. The opener (a Duncit admin, or the club admin who opened it for
 * their club) is sent to the club queue when they are that club admin, and to
 * the venue queue otherwise — the one partner page an admin account can read.
 */
function stakeholders(doc: IAutoPod): { id: string; link: string }[] {
  const rows: { id: string; link: string }[] = [];
  if (doc.venue_claim) rows.push({ id: String(doc.venue_claim.owner_user_id), link: AUTO_POD_LINKS.venue });
  if (doc.host_claim) rows.push({ id: String(doc.host_claim.user_id), link: AUTO_POD_LINKS.host });
  if (doc.club_claim) rows.push({ id: String(doc.club_claim.user_id), link: AUTO_POD_LINKS.club });
  if (doc.created_by) {
    const creator = String(doc.created_by);
    const openedForClub = doc.club_claim && String(doc.club_claim.user_id) === creator;
    rows.push({ id: creator, link: openedForClub ? AUTO_POD_LINKS.club : AUTO_POD_LINKS.venue });
  }
  // One notification per person, on the first (most specific) link listed.
  const seen = new Set<string>();
  return rows.filter((row) => (seen.has(row.id) ? false : seen.add(row.id)));
}

/** One push per link, so every recipient lands on their own queue. */
async function pushStakeholders(
  rows: { id: string; link: string }[],
  title: string,
  body: string,
  except: string[] = []
): Promise<void> {
  const byLink = new Map<string, string[]>();
  for (const row of rows) {
    if (except.includes(row.id)) continue;
    byLink.set(row.link, [...(byLink.get(row.link) ?? []), row.id]);
  }
  await Promise.all([...byLink].map(([link, ids]) => push(ids, title, body, link)));
}

const whenLabel = (value?: Date | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

/** "at Play Arena on 12 Sep, 6:00 pm · in Bengaluru, Karnataka" — whatever is
 * known. A virtual offer's date is the admin's, so it is known from the start. */
function whereLine(doc: IAutoPod): string {
  const parts: string[] = [];
  if (doc.venue_claim) {
    parts.push(`at ${doc.venue_claim.venue_name} on ${whenLabel(doc.venue_claim.pod_date_time)}`);
  } else if (doc.pod_mode === 'VIRTUAL' && doc.pod_date_time) {
    parts.push(`online on ${whenLabel(doc.pod_date_time)}`);
  }
  const city = autoPodCityLabel(doc.location);
  if (city) parts.push(`in ${city}`);
  return parts.length > 0 ? ` (${parts.join(' · ')})` : '';
}

const ROLE_NOUN: Record<Role, string> = { venue: 'a venue', host: 'a host', club: 'a club' };

/**
 * Tell each role that has NOT enrolled yet that the offer is waiting on them.
 * Enrolments happen in any order, so this is the one audience computation:
 * the opener calls it with nobody enrolled, and every enrolment calls it again
 * for whoever is still missing — now narrowed to the pinned city. `skip` holds
 * roles for whom this enrolment changed nothing, so they are not told twice.
 */
async function remaining(doc: IAutoPod, skip: Role[] = []): Promise<void> {
  if (doc.is_active === false) return;
  const missing: Role[] = [];
  // A virtual offer has no venue to wait for.
  const needsVenue = doc.pod_mode !== 'VIRTUAL' && !doc.venue_claim;
  if (needsVenue && !skip.includes('venue')) missing.push('venue');
  if (!doc.host_claim && !skip.includes('host')) missing.push('host');
  if (!doc.club_claim && !skip.includes('club')) missing.push('club');
  if (missing.length === 0) return;

  const where = whereLine(doc);
  const audiences = await Promise.all(
    missing.map(async (role) => {
      if (role === 'venue') return venueOwnerIds(doc);
      if (role === 'host') return hostIds(doc);
      return clubAdminIds(doc);
    })
  );
  const actions: Record<Role, string> = {
    venue: 'Accept it with one of your slots.',
    host: 'Assign yourself to host it.',
    club: 'Claim it for your club.',
  };
  await Promise.all(
    missing.map((role, index) =>
      push(
        audiences[index],
        `Auto Pod needs ${ROLE_NOUN[role]}`,
        `"${doc.pod_title}"${where} is waiting for ${ROLE_NOUN[role]}. ${actions[role]}`,
        AUTO_POD_LINKS[role]
      )
    )
  );
}

export const autoPodNotify = {
  /** A new offer is on the table — every role that could take it hears. */
  async opened(doc: IAutoPod) {
    await remaining(doc);
  },

  /**
   * One partner enrolled: everyone already on it (and the opener) hears who,
   * and whoever is still missing is asked again — now for this city. A club's
   * enrolment changes nothing a host sees unless it was the one that pinned
   * the city, so hosts are not re-told in that case.
   */
  async enrolled(doc: IAutoPod, who: Role) {
    const headline: Record<Role, string> = {
      venue: `${doc.venue_claim?.venue_name} accepted "${doc.pod_title}" for ${whenLabel(doc.venue_claim?.pod_date_time)}.`,
      host: `${doc.host_claim?.host_name} will host "${doc.pod_title}".`,
      club: `${doc.club_claim?.club_name} claimed "${doc.pod_title}".`,
    };
    const actorId = {
      venue: doc.venue_claim ? String(doc.venue_claim.owner_user_id) : '',
      host: doc.host_claim ? String(doc.host_claim.user_id) : '',
      club: doc.club_claim ? String(doc.club_claim.user_id) : '',
    }[who];
    const skip: Role[] = who === 'club' && doc.location?.bound_by !== 'CLUB' ? ['host'] : [];
    await Promise.all([
      pushStakeholders(stakeholders(doc), `Auto Pod has ${ROLE_NOUN[who]}`, headline[who], [actorId]),
      remaining(doc, skip),
    ]);
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
    const rows = stakeholders(doc).map((row) => ({ id: row.id, link: link ?? row.link }));
    await pushStakeholders(
      rows,
      'Auto Pod is live',
      `"${doc.pod_title}" is now live and open for bookings.`
    );
  },

  async cancelled(doc: IAutoPod) {
    const reason = doc.cancel_reason ? ` Reason: ${doc.cancel_reason}` : '';
    await pushStakeholders(
      stakeholders(doc),
      'Auto Pod cancelled',
      `"${doc.pod_title}" was cancelled before it went live.${reason}`
    );
  },

  async expired(doc: IAutoPod) {
    await pushStakeholders(
      stakeholders(doc),
      'Auto Pod expired',
      `"${doc.pod_title}" expired because its date passed before everyone enrolled.`
    );
  },
};

/** Fire-and-forget wrapper for callers that must never fail on a notification. */
export function notifyQuietly(promise: Promise<void>, component: string, autoPodId: string) {
  promise.catch((error) =>
    logs.server.error('autoPod', component, { error, auto_pod_id: autoPodId })
  );
}
