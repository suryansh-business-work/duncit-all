import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { notifyEvent } from '@services/notify/notify.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { podImageAssets } from '@modules/platform/whatsapp/whatsapp.assets';
import { CONTACT_FIELDS, contactName, waWhen } from './podChangeRequest.common';
import type { IPodChangeRequest, PodChangeRole } from './podChangeRequest.model';

/**
 * Everything a Request Change tells somebody, in one place.
 *
 * Two kinds of message go out, and they are not the same thing:
 *  - the OFFER, to the partner an admin picked. That is the one the spec asks
 *    to reach mail, WhatsApp and the in-app inbox, so it goes through
 *    `notifyEvent` (which sends the mail and WhatsApp legs off ONE params
 *    array — rule 34) plus a `notificationService.create` beside it.
 *  - the STATE CHANGES, to the person who filed the request and to the admins
 *    who have to act. Those are in-app only: an admin queue is checked, not
 *    mailed, and a requester is told inside the studio they filed from.
 *
 * NOTHING here throws. A pod that just moved venue has already moved; a
 * messaging blip must never roll that back. Every entry point is wrapped and
 * logged — the pattern venueSlot.service.ts settled on after an SMTP hiccup
 * once deleted live pods.
 */

/** The WhatsApp scenario / email pair each role's offer travels on. */
const OFFER_EVENT: Record<PodChangeRole, string> = {
  VENUE: 'VENUE_CHANGE_REQUEST_OFFER',
  HOST: 'HOST_CHANGE_REQUEST_OFFER',
  CLUB_ADMIN: 'CLUB_ADMIN_CHANGE_REQUEST_OFFER',
};

/**
 * Where the offer's CTA lands, per role.
 *
 * mWeb and the Partners console both answer a change request, and a partner on
 * a phone is the likelier reader, so the link is mWeb's — the same choice every
 * other partner message here makes.
 */
const STUDIO_PATH: Record<PodChangeRole, string> = {
  VENUE: '/change-requests',
  HOST: '/change-requests',
  CLUB_ADMIN: '/change-requests',
};

/** Titles carry the words "Change Request" on purpose: the notification inbox
 * derives its icon and filter chip from title keywords, never from a type. */
const OFFER_TITLE = 'Change Request — a pod is looking for you';
const PASSED_TITLE = 'Change Request — the partner passed';
const FILED_TITLE = 'Change Request filed';
const RESOLVED_TITLE = 'Change Request resolved';

async function studioLink(role: PodChangeRole): Promise<string> {
  const { appUrl } = await getUrlConfigs();
  return `${appUrl.replace(/\/+$/, '')}${STUDIO_PATH[role]}`;
}

/** The "what is this pod" line every message repeats. */
interface OfferFacts {
  podTitle: string;
  clubName: string;
  venueName: string;
  date: string;
  time: string;
}

async function offerFacts(pod: any, slotStart: Date | null): Promise<OfferFacts> {
  const [club, venue] = await Promise.all([
    pod.club_id ? ClubModel.findById(pod.club_id).select('club_name').lean() : null,
    pod.venue_id ? VenueModel.findById(pod.venue_id).select('venue_name').lean() : null,
  ]);
  const { date, time } = waWhen(slotStart ?? pod.pod_date_time);
  return {
    podTitle: pod.pod_title ?? '',
    clubName: (club as any)?.club_name ?? '',
    venueName: (venue as any)?.venue_name ?? '',
    date,
    time,
  };
}

/**
 * The offer itself: mail + WhatsApp + the in-app row, to the one partner an
 * admin picked.
 *
 * The `params` array is positional and its order is the contract the catalogue
 * row mirrors — the fifth value differs per role (the club for a venue and a
 * club admin, the venue for a host) because that is what each of them needs to
 * decide, and the templates are worded for it.
 */
export async function notifyChangeOffer(
  request: IPodChangeRequest,
  pod: any,
  candidateUserId: string,
  slotStart: Date | null
): Promise<void> {
  try {
    const candidate = await UserModel.findById(candidateUserId).select(CONTACT_FIELDS).lean();
    if (!candidate) return;
    const facts = await offerFacts(pod, slotStart);
    const link = await studioLink(request.role);
    const name = contactName(candidate);
    // AiSensy refuses a send whose params are not all non-blank, and a VIRTUAL
    // pod has no venue at all — so the fifth value falls back to the other side
    // rather than taking the whole message down.
    const context =
      (request.role === 'HOST' ? facts.venueName : facts.clubName) ||
      facts.clubName ||
      facts.venueName ||
      facts.podTitle;

    await notifyEvent({
      event: OFFER_EVENT[request.role],
      entityId: String(request._id),
      user: candidate,
      name,
      assets: podImageAssets(pod.pod_images_and_videos),
      params: [name, facts.podTitle, facts.date, facts.time, context, link],
      vars: { change_request_no: request.change_request_no, studio_url: link },
    });

    await notificationService.create({
      title: OFFER_TITLE,
      body: `${facts.podTitle} on ${facts.date} needs you. Approve it or pass.`,
      image_url: pod.pod_images_and_videos?.[0]?.url ?? null,
      link_url: STUDIO_PATH[request.role],
      scope: 'USER',
      target_user_ids: [candidateUserId],
    });
  } catch (error) {
    logs.server.error('podChangeRequest', 'notifyChangeOffer', {
      error,
      request_id: String(request._id),
    });
  }
}

/** In-app only. The requester learns their ask landed and what it cost. */
export async function notifyRequestFiled(request: IPodChangeRequest, podTitle: string) {
  try {
    const cost = request.health_penalty > 0
      ? ` ${request.health_penalty} Account Health points were deducted.`
      : '';
    await notificationService.create({
      title: FILED_TITLE,
      body: `We have your request to change the ${roleWord(request.role)} for ${podTitle}.${cost}`,
      link_url: STUDIO_PATH[request.role],
      scope: 'USER',
      target_user_ids: [String(request.requested_by)],
    });
  } catch (error) {
    logs.server.error('podChangeRequest', 'notifyRequestFiled', {
      error,
      request_id: String(request._id),
    });
  }
}

/** In-app only. The requester learns how it ended. */
export async function notifyRequestResolved(
  request: IPodChangeRequest,
  podTitle: string,
  body: string
) {
  try {
    await notificationService.create({
      title: RESOLVED_TITLE,
      body: `${podTitle}: ${body}`,
      link_url: STUDIO_PATH[request.role],
      scope: 'USER',
      target_user_ids: [String(request.requested_by)],
    });
  } catch (error) {
    logs.server.error('podChangeRequest', 'notifyRequestResolved', {
      error,
      request_id: String(request._id),
    });
  }
}

/**
 * In-app only, to the platform admins who work the queue.
 *
 * Scope USER over an explicit id list, never GLOBAL: GLOBAL loads every active
 * account on the platform and writes one inbox row each.
 */
export async function notifyAdmins(title: string, body: string) {
  try {
    // `metadata.role_keys`, NOT `roles`: the latter is a mongoose virtual over
    // it, and a virtual cannot be queried — a filter on it silently matches
    // nobody, which would make this whole fan-out a no-op with no error.
    const admins = await UserModel.find({
      'metadata.status': 'ACTIVE',
      'metadata.role_keys': { $in: ['SUPER_ADMIN', 'CITY_ADMIN'] },
    })
      .select('_id')
      .limit(50)
      .lean();
    const ids = (admins as any[]).map((a) => String(a._id));
    if (ids.length === 0) return;
    await notificationService.create({
      title,
      body,
      link_url: '/pods/change-requests',
      scope: 'USER',
      target_user_ids: ids,
    });
  } catch (error) {
    logs.server.error('podChangeRequest', 'notifyAdmins', { error });
  }
}

/** "the venue" / "the host" / "the club admin", for a sentence. */
export function roleWord(role: PodChangeRole): string {
  if (role === 'VENUE') return 'venue';
  if (role === 'HOST') return 'host';
  return 'club admin';
}

/** The admins' "somebody passed" nudge, so a stalled request is not silent. */
export async function notifyOfferPassed(
  request: IPodChangeRequest,
  podTitle: string,
  who: string
) {
  await notifyAdmins(
    PASSED_TITLE,
    `${who || 'The partner'} passed on ${podTitle}. ${request.change_request_no} is back in the queue.`
  );
}

/** Attendees whose pod just moved to a different venue, date or time.
 *
 * Not in the spec, and not optional either: a seat somebody paid for now sits
 * somewhere else. In-app only — the cancellation mails are the ones that carry
 * money, and this is a change of address, not a refund. */
export async function notifyAttendeesOfVenueChange(pod: any, venueName: string, when: string) {
  try {
    const targets = (pod.pod_attendees ?? [])
      .map(String)
      .filter((id: string) => Types.ObjectId.isValid(id));
    if (targets.length === 0) return;
    await notificationService.create({
      title: `New venue for ${pod.pod_title}`,
      body: `${pod.pod_title} now runs at ${venueName} on ${when}. Your seat moved with it.`,
      image_url: pod.pod_images_and_videos?.[0]?.url ?? null,
      scope: 'USER',
      target_user_ids: targets,
    });
  } catch (error) {
    logs.server.error('podChangeRequest', 'notifyAttendeesOfVenueChange', {
      error,
      pod_id: String(pod?._id ?? ''),
    });
  }
}
