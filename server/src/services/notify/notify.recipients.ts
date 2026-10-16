import type { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';

/**
 * The account fields both legs of `notifyEvent` read: the names the message is
 * addressed with, the two numbers the WhatsApp leg chooses between, and the
 * address the email leg goes to. A narrower projection is the quiet way to make
 * every send in a fan-out skip, so every new notifier loads through here.
 */
export const NOTIFY_USER_FIELDS =
  'profile.first_name profile.last_name auth.email auth.phone communication.whatsapp';

interface StoredNumber {
  extension?: string | null;
  number?: string | null;
}

/** Exactly what {@link NOTIFY_USER_FIELDS} selects. A type alias, not an
 * interface, so it is assignable to the funnel's `Record<string, any>` user. */
export type NotifyUser = {
  _id?: Types.ObjectId;
  profile?: { first_name?: string | null; last_name?: string | null } | null;
  auth?: { email?: string | null; phone?: StoredNumber | null } | null;
  communication?: { whatsapp?: StoredNumber | null } | null;
};

/** An account id as the callers hold it: an ObjectId off a document, or its string. */
export type AccountId = Types.ObjectId | string | null | undefined;

/** The accounts behind `ids`, keyed by id. Blank and repeated ids are dropped. */
export async function loadNotifyRecipients(ids: readonly AccountId[]): Promise<Map<string, NotifyUser>> {
  const unique = [...new Set(ids.map((id) => (id ? id.toString() : '')).filter(Boolean))];
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } }).select(NOTIFY_USER_FIELDS).lean<NotifyUser[]>();
  return new Map(users.map((user) => [user._id?.toString() ?? '', user]));
}

/** "First Last", or the WhatsApp contact fallback when the account has no name. */
export const recipientName = (user?: NotifyUser | null): string =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim() || 'there';
