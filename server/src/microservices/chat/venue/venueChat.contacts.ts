/**
 * The other side's contact details, for the venue chat's header. The two sides
 * of a booking negotiate in this thread and have to be able to call each other
 * — but typed contact details are refused in the chat itself (its content
 * rules), so they come from the accounts instead: the venue sees its pod's lead
 * host, the host sees the venue's listed owner contact.
 */
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import type { VenueChatThread } from './venueChat.access';

export interface VenueChatContact {
  name: string;
  phone: string;
  email: string;
}

const NONE: VenueChatContact = { name: '', phone: '', email: '' };

type ContactUser = {
  profile?: { first_name?: string | null; last_name?: string | null } | null;
  auth?: { email?: string | null; phone?: { extension?: string | null; number?: string | null } | null } | null;
} | null;

const fullName = (user: ContactUser) =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

const phoneOf = (user: ContactUser) => {
  const number = (user?.auth?.phone?.number ?? '').trim();
  return number ? `${user?.auth?.phone?.extension ?? ''}${number}` : '';
};

const CONTACT_FIELDS = 'profile.first_name profile.last_name auth.email auth.phone.extension auth.phone.number';

/** The pod's lead host — who a venue calls about the booking. */
async function hostContact(thread: VenueChatThread): Promise<VenueChatContact> {
  const hostId = thread.hostIds[0];
  if (!hostId) return NONE;
  const host = await UserModel.findById(hostId).select(CONTACT_FIELDS).lean<ContactUser>();
  return { name: fullName(host), phone: phoneOf(host), email: (host?.auth?.email ?? '').trim() };
}

/** The venue's listed owner contact, falling back to its owner's account. */
async function venueContact(thread: VenueChatThread): Promise<VenueChatContact> {
  const venue = await VenueModel.findById(thread.venueId).select('owner_name owner_phone owner_email').lean();
  const listed = { name: venue?.owner_name ?? '', phone: venue?.owner_phone ?? '', email: venue?.owner_email ?? '' };
  if (listed.phone.trim() && listed.email.trim()) return { name: listed.name.trim(), phone: listed.phone.trim(), email: listed.email.trim() };
  const owner = await UserModel.findById(thread.ownerId).select(CONTACT_FIELDS).lean<ContactUser>();
  return {
    name: listed.name.trim() || fullName(owner),
    phone: listed.phone.trim() || phoneOf(owner),
    email: listed.email.trim() || (owner?.auth?.email ?? '').trim(),
  };
}

/** Who the caller is talking to: the lead host for the venue, the venue for a host. */
export function counterpartContact(thread: VenueChatThread, side: 'HOST' | 'VENUE'): Promise<VenueChatContact> {
  return side === 'VENUE' ? hostContact(thread) : venueContact(thread);
}
