import { logs } from '@observability/log';
import { appDateTime } from '@utils/app-time';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import type { IPodPartnerRequest } from './podPartnerRequest.model';

/** Every request event a party is told about, in the app's notification inbox (and push). */
export type PartnerRequestEvent =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SLOT_REQUESTED'
  | 'SLOT_CONFIRMED'
  | 'SLOT_DECLINED'
  | 'POD_CREATED';

/** Where each notification opens: the request itself, on mWeb and native alike. */
export const partnerRequestPath = (id: string) => `/pod-requests/${id}`;

const COPY: Record<PartnerRequestEvent, (from: string, when: string) => { title: string; body: string }> = {
  REQUESTED: (from) => ({ title: 'New Pod Request', body: `${from} would like to run a pod with you. Review the request.` }),
  ACCEPTED: (from) => ({ title: 'Pod Request accepted', body: `${from} accepted your Pod Request. Pick a slot next.` }),
  REJECTED: (from) => ({ title: 'Pod Request declined', body: `${from} declined your Pod Request.` }),
  SLOT_REQUESTED: (from, when) => ({ title: 'Slot request received', body: `${from} picked ${when}. Confirm the slot to continue.` }),
  SLOT_CONFIRMED: (from, when) => ({ title: 'Slot confirmed', body: `${from} confirmed ${when}. The pod can be created now.` }),
  SLOT_DECLINED: (from, when) => ({ title: 'Slot declined', body: `${from} could not do ${when}. Pick another slot.` }),
  POD_CREATED: (from) => ({ title: 'Pod created', body: `The pod with ${from} is live. Contact details are now shared on the request.` }),
};

/** The sender's display name as the recipient should read it — the venue's name, or the host's. */
async function nameForSide(doc: IPodPartnerRequest, side: 'HOST' | 'VENUE'): Promise<string> {
  if (side === 'VENUE') {
    const venue = await VenueModel.findById(doc.venue_id).select('venue_name').lean();
    return venue?.venue_name || 'A venue';
  }
  const host = await UserModel.findById(doc.host_user_id).select('profile.first_name profile.last_name').lean<{
    profile?: { first_name?: string; last_name?: string };
  }>();
  return `${host?.profile?.first_name ?? ''} ${host?.profile?.last_name ?? ''}`.trim() || 'A host';
}

/**
 * Tells `to` that the other side did something. Best-effort: the transition is
 * already saved when this runs, so a notification failure is logged, never
 * thrown. No phone or email ever goes into the copy — contact is shared on the
 * request only after the pod exists.
 */
export async function notifyPartner(doc: IPodPartnerRequest, event: PartnerRequestEvent, to: 'HOST' | 'VENUE') {
  try {
    const from = await nameForSide(doc, to === 'HOST' ? 'VENUE' : 'HOST');
    const when = doc.slot_start_at ? appDateTime(doc.slot_start_at) : '';
    const { title, body } = COPY[event](from, when);
    const target = String(to === 'HOST' ? doc.host_user_id : doc.venue_owner_user_id);
    const { notificationService } = await import('@modules/engagement/notification/notification.service');
    await notificationService.create({
      title,
      body,
      scope: 'USER',
      target_user_ids: [target],
      link_url: partnerRequestPath(String(doc._id)),
      silent: false,
    });
  } catch (error) {
    logs.server.error('pod-partner-request', 'notify', { error, event, request_id: String(doc._id) });
  }
}
