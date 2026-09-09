import { Types } from 'mongoose';
import { ContactInviteModel } from './contacts.model';
import { UserModel } from '@modules/access/user/user.model';
import { referralService } from '@modules/engagement/referral/referral.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { defaultDialCode, toE164 } from '@modules/crm/call/phone';
import { getUrlConfigs } from '@config/url-configs';
import { phoneKey } from '@utils/phone';
import { escapeRegExp } from '@utils/regex';

/** The scenario an invite goes out on. Registered in `whatsapp.events.ts`. */
const INVITE_EVENT = 'USER_CONTACT_INVITE';

/** How many numbers one screen lists. Past this the list is a phone book. */
const MAX_INVITABLE = 500;
/**
 * How many invites one call sends. AiSensy is posted one message at a time, so
 * a bigger batch is a longer request rather than a faster one — "Invite all"
 * sends this many and leaves the rest for the next press.
 */
const MAX_PER_CALL = 100;
/**
 * How many invites one account may send in a rolling day.
 *
 * Every invite is a billed marketing message to somebody who never asked
 * Duncit for anything, so the ceiling is the platform's, not the sender's. A
 * number is invitable once (the log's unique slot), so this bounds the pace
 * rather than the total.
 */
const MAX_PER_DAY = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Nobody's phone book saves everyone under a name; the template still needs one. */
const FALLBACK_LABEL = 'there';

export interface InviteResult {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** The comparable key of every number this account can be reached on. */
export const keysOfUser = (doc: any): string[] =>
  [phoneKey(doc?.auth?.phone?.number), phoneKey(doc?.communication?.whatsapp?.number)].filter(
    Boolean
  );

/**
 * Remember the numbers a sync did NOT match, and forget the ones that left.
 *
 * Called from `syncContacts` with the same keyed phone book the matcher read,
 * so the two halves can never disagree about which numbers were on it. A row
 * that has already been invited keeps its stamp — re-syncing a phone book is
 * not a reason to offer to text somebody again.
 */
export async function recordInvitable(
  owner: Types.ObjectId,
  keyed: ReadonlyMap<string, string>,
  matchedKeys: ReadonlySet<string>
): Promise<number> {
  const unmatched = [...keyed.entries()].filter(([key]) => !matchedKeys.has(key));
  if (unmatched.length > 0) {
    await ContactInviteModel.bulkWrite(
      unmatched.map(([key, label]) => ({
        updateOne: {
          filter: { owner_id: owner, phone_key: key },
          update: { $set: { contact_label: label }, $setOnInsert: { invited_at: null } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }
  await ContactInviteModel.deleteMany({
    owner_id: owner,
    phone_key: { $nin: unmatched.map(([key]) => key) },
  });
  return unmatched.length;
}

/** What the invite tab renders: the phone book minus everyone already here. */
async function listInvitable(userId: string, search?: string | null) {
  const filter: Record<string, unknown> = { owner_id: new Types.ObjectId(userId) };
  const term = String(search ?? '').trim();
  if (term) filter.contact_label = new RegExp(escapeRegExp(term), 'i');
  const rows = await ContactInviteModel.find(filter)
    .sort({ invited_at: 1, contact_label: 1 })
    .limit(MAX_INVITABLE)
    .lean();
  return rows.map((row) => ({
    phone_key: row.phone_key,
    contact_label: row.contact_label ?? '',
    invited_at: row.invited_at ? row.invited_at.toISOString() : null,
  }));
}

/** How many invites this account may still send today. */
async function remainingToday(owner: Types.ObjectId): Promise<number> {
  const since = new Date(Date.now() - DAY_MS);
  const spent = await ContactInviteModel.countDocuments({
    owner_id: owner,
    invited_at: { $gte: since },
  });
  return Math.max(0, Math.min(MAX_PER_CALL, MAX_PER_DAY - spent));
}

/** Who the invite is from, and what it offers — read once for the whole batch. */
async function inviteContext(userId: string) {
  const [me, referral, dial, urls] = await Promise.all([
    UserModel.findById(userId).select('profile.first_name profile.last_name').lean(),
    referralService.myReferral(userId),
    defaultDialCode(),
    getUrlConfigs(),
  ]);
  const profile = (me as any)?.profile ?? {};
  // Never blank: AiSensy renders a missing value as the literal `{{2}}` and
  // bills for the message, so the send is refused before it gets there.
  const inviter = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'A friend';
  const base = urls.mwebUrl.replace(/\/+$/, '');
  return {
    inviter,
    dial,
    coins: referral.coins_per_referral,
    link: `${base}/register?ref=${encodeURIComponent(referral.code)}`,
  };
}

/**
 * Text the chosen contacts an invite, and stamp the ones that went.
 *
 * `phone_keys` empty means every number still waiting — the "Invite all"
 * button — capped at {@link MAX_PER_CALL}. A number that has already been
 * invited is never texted a second time: the row's stamp keeps it out of this
 * batch, and `WaMessageLog`'s unique slot (event + inviter + destination) is
 * the guarantee underneath, so two taps racing each other still send once.
 *
 * The day's remaining allowance is what actually bounds the batch. Pressing
 * "Invite all" is one press, but each message is a billed marketing send to
 * somebody who never asked Duncit for anything — a phone book of five thousand
 * numbers must not become five thousand texts in an afternoon.
 */
async function inviteContacts(userId: string, phoneKeys: readonly string[]): Promise<InviteResult> {
  const owner = new Types.ObjectId(userId);
  const allowance = await remainingToday(owner);
  if (allowance === 0) return { requested: 0, sent: 0, skipped: 0, failed: 0 };
  const chosen = phoneKeys.map((key) => phoneKey(key)).filter(Boolean);
  const filter: Record<string, unknown> = { owner_id: owner, invited_at: null };
  if (chosen.length > 0) filter.phone_key = { $in: chosen };
  const rows = await ContactInviteModel.find(filter).limit(allowance).lean();
  if (rows.length === 0) return { requested: 0, sent: 0, skipped: 0, failed: 0 };

  const context = await inviteContext(userId);
  const outcomes = await whatsappService.sendEach(
    rows.map((row) => ({
      event: INVITE_EVENT,
      // One invite per number per inviter, for good: the unique slot is keyed
      // on this, so a second attempt is skipped rather than billed.
      entityId: userId,
      destination: toE164(row.phone_key, context.dial),
      name: row.contact_label || FALLBACK_LABEL,
      params: [
        row.contact_label || FALLBACK_LABEL,
        context.inviter,
        context.coins,
        context.link,
      ],
    }))
  );

  const now = new Date();
  const sentKeys = rows
    .filter((_row, index) => outcomes[index].status === 'SENT')
    .map((row) => row.phone_key);
  if (sentKeys.length > 0) {
    await ContactInviteModel.updateMany(
      { owner_id: owner, phone_key: { $in: sentKeys } },
      { $set: { invited_at: now } }
    );
  }
  return {
    requested: rows.length,
    sent: sentKeys.length,
    skipped: outcomes.filter((outcome) => outcome.status === 'SKIPPED').length,
    failed: outcomes.filter((outcome) => outcome.status === 'FAILED').length,
  };
}

export const contactsInviteService = { listInvitable, inviteContacts };
