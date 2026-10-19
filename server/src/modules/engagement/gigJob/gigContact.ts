import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { destinationFor } from '@modules/crm/marketing/waCampaign.recipients';

export interface GigContact {
  name: string;
  phone: string;
  email: string;
}

const CONTACT_FIELDS = 'profile.first_name profile.last_name auth.email auth.phone communication.whatsapp';

/**
 * The contact a member's account already holds — the starting value of a
 * gig post's or a freelancer profile's contact fields, which they may change.
 * The phone is the reachable number (WhatsApp first), with its country code.
 */
export async function accountContact(userId: string): Promise<GigContact> {
  if (!Types.ObjectId.isValid(userId)) return { name: '', phone: '', email: '' };
  const user = await UserModel.findById(userId).select(CONTACT_FIELDS).lean();
  if (!user) return { name: '', phone: '', email: '' };
  const name = `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim();
  const number = destinationFor(user);
  return { name, phone: number ? `+${number}` : '', email: String(user.auth?.email ?? '') };
}
