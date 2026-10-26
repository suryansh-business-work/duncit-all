/**
 * Both sides of a venue booking's chat, for the thread's contact sheet: the
 * pod's lead host and the venue, each with a face, a few details and how to
 * reach them. The two sides negotiate in this thread and have to be able to
 * call each other — but typed contact details are refused in the chat itself
 * (its content rules), so they come from the accounts instead: the host's own
 * account, and the venue's listed owner contact (falling back to its owner's
 * account). Both members see both cards.
 */
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import type { VenueChatThread } from './venueChat.access';

export interface VenueChatContact {
  name: string;
  phone: string;
  email: string;
}

/** The pod's lead host, as the contact sheet shows them. */
export interface VenueChatHostCard extends VenueChatContact {
  user_id: string;
  photo: string;
  username: string;
  bio: string;
}

/** The venue, as the contact sheet shows it. `name` is the person to ask for. */
export interface VenueChatVenueCard extends VenueChatContact {
  venue_id: string;
  venue_name: string;
  photo: string;
  venue_type: string;
  capacity: number;
  address: string;
}

type ContactUser = {
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    profile_photo?: string | null;
    username?: string | null;
    bio?: string | null;
  } | null;
  auth?: { email?: string | null; phone?: { extension?: string | null; number?: string | null } | null } | null;
} | null;

const fullName = (user: ContactUser) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

const phoneOf = (user: ContactUser) => {
  const number = (user?.auth?.phone?.number ?? '').trim();
  return number ? `${user?.auth?.phone?.extension ?? ''}${number}` : '';
};

const CONTACT_FIELDS = 'profile.first_name profile.last_name auth.email auth.phone.extension auth.phone.number';
const HOST_FIELDS = `${CONTACT_FIELDS} profile.profile_photo profile.username profile.bio`;
const VENUE_FIELDS = 'venue_name cover_image_url venue_type capacity address_line1 locality city owner_name owner_phone owner_email';

/** The pod's lead host — who a venue calls about the booking. Null for a pod with no host on record. */
async function hostCard(thread: VenueChatThread): Promise<VenueChatHostCard | null> {
  const hostId = thread.hostIds[0];
  if (!hostId) return null;
  const host = await UserModel.findById(hostId).select(HOST_FIELDS).lean<ContactUser>();
  return {
    user_id: hostId,
    name: fullName(host),
    photo: host?.profile?.profile_photo ?? '',
    username: host?.profile?.username ?? '',
    bio: (host?.profile?.bio ?? '').trim(),
    phone: phoneOf(host),
    email: (host?.auth?.email ?? '').trim(),
  };
}

/** The venue and its listed owner contact, falling back to its owner's account for what is not listed. */
async function venueCard(thread: VenueChatThread): Promise<VenueChatVenueCard> {
  const venue = await VenueModel.findById(thread.venueId).select(VENUE_FIELDS).lean();
  const listed = {
    name: (venue?.owner_name ?? '').trim(),
    phone: (venue?.owner_phone ?? '').trim(),
    email: (venue?.owner_email ?? '').trim(),
  };
  const owner =
    listed.name && listed.phone && listed.email
      ? null
      : await UserModel.findById(thread.ownerId).select(CONTACT_FIELDS).lean<ContactUser>();
  return {
    venue_id: thread.venueId,
    venue_name: thread.venueName,
    photo: thread.venuePhoto,
    venue_type: venue?.venue_type ?? '',
    capacity: venue?.capacity ?? 0,
    address: [venue?.address_line1, venue?.locality, venue?.city].map((part) => (part ?? '').trim()).filter(Boolean).join(', '),
    name: listed.name || fullName(owner),
    phone: listed.phone || phoneOf(owner),
    email: listed.email || (owner?.auth?.email ?? '').trim(),
  };
}

/** Both sides' cards, read together. */
export async function chatParties(thread: VenueChatThread) {
  const [host, venue] = await Promise.all([hostCard(thread), venueCard(thread)]);
  return { host, venue };
}

/** Who the caller is talking to: the lead host for the venue, the venue's contact for a host. */
export function counterpartOf(
  parties: Awaited<ReturnType<typeof chatParties>>,
  side: 'HOST' | 'VENUE'
): VenueChatContact {
  const card = side === 'VENUE' ? parties.host : parties.venue;
  return { name: card?.name ?? '', phone: card?.phone ?? '', email: card?.email ?? '' };
}
