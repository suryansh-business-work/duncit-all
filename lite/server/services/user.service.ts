import { LiteEventModel } from '../models/event.model';
import { LiteRegistrationModel } from '../models/registration.model';
import { DISPLAY_MODES, LiteUserModel, SOCIAL_KEYS, type DisplayMode, type LiteUserDoc, type SocialKey } from '../models/user.model';
import { badInput, notFound } from '../utils/errors';
import { iso } from '../utils/ids';
import { slugify } from '../utils/slug';
import { HANDLE, SOCIAL_HANDLE, cleanText, optionalUpi, optionalUrl } from '../utils/validate';

export type SocialInput = Partial<Record<SocialKey, string | null>>;

export interface ProfileInput {
  name?: string | null;
  handle?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  upi_id?: string | null;
  upi_name?: string | null;
  social?: SocialInput | null;
  display_mode?: string | null;
}

const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  website: 'Website',
};

/** Every social link, '' for the ones not set, so a client can render them without guessing. */
const socialOf = (doc: { social?: Partial<Record<SocialKey, string>> | null }) =>
  Object.fromEntries(SOCIAL_KEYS.map((key) => [key, doc.social?.[key] || ''])) as Record<SocialKey, string>;

/**
 * A social handle as the person typed it, minus a leading @ — the site's own
 * prefix is in the client. The website is a full link instead.
 */
function cleanSocial(key: SocialKey, value: string | null | undefined): string {
  if (key === 'website') return optionalUrl(value, SOCIAL_LABELS.website);
  const handle = cleanText(value, 100, SOCIAL_LABELS[key]).replace(/^@/, '');
  if (handle && !SOCIAL_HANDLE.test(handle)) throw badInput(`Enter just your ${SOCIAL_LABELS[key]} handle, without the full link`);
  return handle;
}

/** The public projection of an account. Email, phone and UPI are only for the owner and admins. */
export function toPublicUser(doc: any, opts: { withEmail?: boolean; eventsHosted?: number; eventsAttended?: number } = {}) {
  const own = Boolean(opts.withEmail);
  return {
    id: String(doc._id),
    email: own ? doc.email || '' : '',
    phone: own ? doc.phone || null : null,
    name: doc.name,
    handle: doc.handle,
    avatar_url: doc.avatar_url || null,
    bio: doc.bio || null,
    social: socialOf(doc),
    upi_id: own ? doc.upi_id || null : null,
    upi_name: own ? doc.upi_name || null : null,
    locale: doc.locale || null,
    display_mode: (doc.display_mode as DisplayMode) || 'SYSTEM',
    is_admin: Boolean(doc.is_admin),
    is_blocked: Boolean(doc.is_blocked),
    duncit_linked: Boolean(doc.duncit_user_id),
    events_hosted: opts.eventsHosted ?? 0,
    events_attended: opts.eventsAttended ?? 0,
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

  /** Events the person went to: a confirmed seat at an event that has already ended. */
  async attendedCount(userId: unknown): Promise<number> {
    return LiteRegistrationModel.countDocuments({ user_id: userId, status: 'CONFIRMED', event_start_at: { $lt: new Date() } });
  },

  async me(user: LiteUserDoc) {
    const [hosted, attended] = await Promise.all([this.hostedCount(user._id), this.attendedCount(user._id)]);
    return toPublicUser(user, { withEmail: true, eventsHosted: hosted, eventsAttended: attended });
  },

  async byHandle(handle: string) {
    const doc = await LiteUserModel.findOne({ handle: handle.toLowerCase(), is_blocked: false }).lean();
    if (!doc) return null;
    const [hosted, attended] = await Promise.all([this.hostedCount(doc._id), this.attendedCount(doc._id)]);
    return toPublicUser(doc, { eventsHosted: hosted, eventsAttended: attended });
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
    if (input.social != null) {
      const social = input.social;
      const next = socialOf(user);
      for (const key of SOCIAL_KEYS) if (social[key] != null) next[key] = cleanSocial(key, social[key]);
      user.set('social', next);
    }
    if (input.display_mode != null) {
      if (!DISPLAY_MODES.includes(input.display_mode as DisplayMode)) throw badInput('Pick System, Light or Dark');
      user.display_mode = input.display_mode as DisplayMode;
    }
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

  async byPhone(phone: string): Promise<LiteUserDoc | null> {
    return LiteUserModel.findOne({ phone });
  },

  async requireByIdLean(id: string) {
    const doc = await LiteUserModel.findById(id).lean();
    if (!doc) throw notFound('Account');
    return doc;
  },
};
