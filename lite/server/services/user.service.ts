import { LiteEventModel } from '../models/event.model';
import { LiteUserModel, type LiteUserDoc } from '../models/user.model';
import { badInput, notFound } from '../utils/errors';
import { iso } from '../utils/ids';
import { slugify } from '../utils/slug';
import { HANDLE, cleanText, optionalUpi, optionalUrl } from '../utils/validate';

export interface ProfileInput {
  name?: string | null;
  handle?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  upi_id?: string | null;
  upi_name?: string | null;
}

/** The public projection of an account. `email` is only for the owner and admins. */
export function toPublicUser(doc: any, opts: { withEmail?: boolean; eventsHosted?: number } = {}) {
  return {
    id: String(doc._id),
    email: opts.withEmail ? doc.email : '',
    name: doc.name,
    handle: doc.handle,
    avatar_url: doc.avatar_url || null,
    bio: doc.bio || null,
    upi_id: opts.withEmail ? doc.upi_id || null : null,
    upi_name: opts.withEmail ? doc.upi_name || null : null,
    locale: doc.locale || null,
    is_admin: Boolean(doc.is_admin),
    is_blocked: Boolean(doc.is_blocked),
    duncit_linked: Boolean(doc.duncit_user_id),
    events_hosted: opts.eventsHosted ?? 0,
    created_at: iso(doc.created_at) ?? '',
  };
}

/** A handle nobody else has, from the name (or the mailbox) plus a number when taken. */
export async function freeHandle(seed: string): Promise<string> {
  const base = slugify(seed).replaceAll('-', '_').slice(0, 24) || 'guest';
  const root = HANDLE.test(base) ? base : `guest_${base.replaceAll(/[^a-z0-9_]/g, '')}`.slice(0, 24);
  if (!(await LiteUserModel.exists({ handle: root }))) return root;
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${root}${n}`;
    if (!(await LiteUserModel.exists({ handle: candidate }))) return candidate;
  }
  return `${root}${Date.now().toString(36)}`;
}

export const userService = {
  async hostedCount(userId: unknown): Promise<number> {
    return LiteEventModel.countDocuments({ 'hosts.user_id': userId, status: 'PUBLISHED', hidden: false });
  },

  async me(user: LiteUserDoc) {
    return toPublicUser(user, { withEmail: true, eventsHosted: await this.hostedCount(user._id) });
  },

  async byHandle(handle: string) {
    const doc = await LiteUserModel.findOne({ handle: handle.toLowerCase(), is_blocked: false }).lean();
    if (!doc) return null;
    return toPublicUser(doc, { eventsHosted: await this.hostedCount(doc._id) });
  },

  async updateProfile(user: LiteUserDoc, input: ProfileInput) {
    if (input.name != null) user.name = cleanText(input.name, 80, 'Name', true);
    if (input.handle != null) {
      const handle = input.handle.trim().toLowerCase();
      if (!HANDLE.test(handle)) throw badInput('A handle is 3 to 30 letters, numbers or underscores');
      const taken = await LiteUserModel.exists({ handle, _id: { $ne: user._id } });
      if (taken) throw badInput('That handle is already taken');
      user.handle = handle;
    }
    if (input.bio != null) user.bio = cleanText(input.bio, 500, 'Bio');
    if (input.avatar_url != null) user.avatar_url = optionalUrl(input.avatar_url, 'Avatar');
    if (input.upi_id != null) user.upi_id = optionalUpi(input.upi_id);
    if (input.upi_name != null) user.upi_name = cleanText(input.upi_name, 80, 'UPI payee name');
    await user.save();
    return this.me(user);
  },

  async setLocale(user: LiteUserDoc, locale: string) {
    user.locale = cleanText(locale, 20, 'Locale', true);
    await user.save();
    return this.me(user);
  },

  async byEmail(email: string): Promise<LiteUserDoc | null> {
    return LiteUserModel.findOne({ email });
  },

  async requireByIdLean(id: string) {
    const doc = await LiteUserModel.findById(id).lean();
    if (!doc) throw notFound('Account');
    return doc;
  },
};
