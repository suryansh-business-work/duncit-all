import { GraphQLError } from 'graphql';
import { UserModel } from '@modules/access/user/user.model';
import type { WaCampaignAudience } from './waCampaign.model';

/**
 * Who a WhatsApp campaign reaches, and what fills its template variables.
 *
 * Kept apart from the send loop because "who does this reach" is a question the
 * portal asks BEFORE sending — WhatsApp template messages are billed per
 * message, so nobody should have to send one to find out how many go out.
 */
const str = (v: unknown) => String(v ?? '').trim();
const digits = (v: unknown) => str(v).replaceAll(/\D/g, '');

type UserLike = Record<string, any>;

const fullNameOf = (u: UserLike) =>
  [str(u.profile?.first_name), str(u.profile?.last_name)].filter(Boolean).join(' ');

/** The variables a template parameter may carry, resolved per recipient. The
 * portal renders this list, so a new variable needs no client change. */
export const WA_VARIABLES: {
  name: string;
  description: string;
  value: (u: UserLike) => string;
}[] = [
  { name: 'first_name', description: "The recipient's first name.", value: (u) => str(u.profile?.first_name) },
  { name: 'last_name', description: "The recipient's last name.", value: (u) => str(u.profile?.last_name) },
  { name: 'full_name', description: 'First and last name together.', value: fullNameOf },
  { name: 'city', description: "The recipient's city.", value: (u) => str(u.profile?.city) },
  { name: 'state', description: "The recipient's state.", value: (u) => str(u.profile?.state) },
];

const VALUE_OF = new Map(WA_VARIABLES.map((v) => [v.name, v.value]));
const TOKEN_RE = /\{\{(\w+)\}\}/g;

/** Reject unknown {{tokens}} when the campaign is created rather than letting
 * every recipient silently receive the literal text `{{frist_name}}`. */
export function assertKnownTokens(params: string[]) {
  for (const param of params) {
    for (const [, token] of param.matchAll(TOKEN_RE)) {
      if (!VALUE_OF.has(token)) {
        throw new GraphQLError(`Unknown variable {{${token}}} in a template parameter`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }
  }
}

export interface FilledParams {
  params: string[];
  /** Set when the message could not be completed for this person — it is shown
   * against them as the reason they were skipped. */
  missingReason?: string;
}

/**
 * Fill the template parameters for one recipient. A variable that is empty for
 * that person stops the send for them: a WhatsApp template renders a blank
 * there, and a half-written message is worse than no message.
 */
export function fillParams(raw: string[], user: UserLike): FilledParams {
  let missingReason: string | undefined;
  const params = raw.map((param) => {
    const filled = param.replaceAll(TOKEN_RE, (_match, token: string) => {
      const value = VALUE_OF.get(token)?.(user) ?? '';
      if (!value && !missingReason) missingReason = `No value for {{${token}}}`;
      return value;
    });
    return filled.trim();
  });
  if (!missingReason && params.some((param) => !param)) {
    missingReason = 'A template parameter came out empty';
  }
  return { params, missingReason };
}

/**
 * The number AiSensy is given: country code + number, digits only. The saved
 * WhatsApp number wins over the login phone. A number long enough to already
 * carry its country code is used as-is — prefixing the extension again would
 * produce 9191…; a short number with no extension has no country code to send
 * with, so that recipient is not reachable.
 *
 * The leading zero is a trunk prefix, not a country code. People type their
 * number the way they dial it at home (0 98765 43210) while the extension
 * dropdown already says +91, and `91` + `09876543210` dials a real but wrong
 * 13-digit number that AiSensy accepts and bills for.
 */
export function destinationFor(user: UserLike): string {
  const whatsapp = user.communication?.whatsapp;
  const source = digits(whatsapp?.number) ? whatsapp : user.auth?.phone;
  const number = digits(source?.number).replace(/^0+/, '');
  const extension = digits(source?.extension);
  if (!number) return '';
  // With no extension the only sendable number is one already long enough to
  // carry its own country code. Written as its own branch because the length
  // check below reads as if it compared against the extension, and
  // `''.startsWith` is true for every string.
  if (!extension) return number.length > 10 ? number : '';
  if (number.length > 10 && number.startsWith(extension)) return number;
  const full = `${extension}${number}`;
  return full.length >= 10 && full.length <= 15 ? full : '';
}

/** The name AiSensy records for the contact. */
export const userNameFor = (user: UserLike) => fullNameOf(user) || str(user.profile?.first_name);

/** Live accounts that carry some phone number at all. Whether that number is
 * actually sendable is decided per recipient by {@link destinationFor}. */
const HAS_A_NUMBER = {
  'metadata.status': 'ACTIVE',
  'metadata.deleted_at': null,
  $or: [
    { 'communication.whatsapp.number': { $nin: ['', null] } },
    { 'auth.phone.number': { $nin: ['', null] } },
  ],
};

/** Who a send resolves against, beyond the audience kind itself. */
export interface RecipientScope {
  audience_list_id?: unknown;
  /** SPECIFIC_USERS — the accounts that were picked. */
  user_ids?: readonly unknown[];
  /** MANUAL_NUMBERS — numbers typed in, which may belong to no account. */
  contacts?: readonly ManualContact[];
}

export interface ManualContact {
  name: string;
  extension: string;
  number: string;
}

async function recipientFilter(audience: WaCampaignAudience, scope: RecipientScope) {
  if (audience === 'AUDIENCE_LIST') {
    const { audienceListService } = await import('./audienceList.service');
    const ids = await audienceListService.memberIds(String(scope.audience_list_id ?? ''));
    return { ...HAS_A_NUMBER, _id: { $in: ids } };
  }
  if (audience === 'SPECIFIC_USERS') {
    return { ...HAS_A_NUMBER, _id: { $in: [...(scope.user_ids ?? [])] } };
  }
  return HAS_A_NUMBER;
}

/**
 * A typed-in contact as the send loop sees a person. Shaped like the slice of a
 * user document `destinationFor` and `fillParams` read, so one delivery path
 * serves both — an account and a number somebody pasted in.
 *
 * Only the name resolves as a variable here: there is no account behind these,
 * so a template that wants {{city}} skips them, exactly as it would skip an
 * account with no city.
 */
export function manualUsers(contacts: readonly ManualContact[]) {
  return contacts.map((contact) => {
    const name = str(contact.name);
    const [first = '', ...rest] = name.split(/\s+/);
    return {
      _id: null,
      profile: { first_name: first, last_name: rest.join(' ') },
      auth: { phone: { extension: digits(contact.extension), number: digits(contact.number) } },
    };
  });
}

/** Typed-in contacts that carry a number WhatsApp can actually be given. */
const reachableContacts = (contacts: readonly ManualContact[]) =>
  manualUsers(contacts).filter((user) => destinationFor(user)).length;

/** How many people this audience reaches right now. */
export async function countReachable(audience: WaCampaignAudience, scope: RecipientScope = {}) {
  if (audience === 'MANUAL_NUMBERS') return reachableContacts(scope.contacts ?? []);
  return UserModel.countDocuments(await recipientFilter(audience, scope));
}

/** Only the fields a send reads — a campaign has no business loading whole
 * user documents for an audience of thousands. */
const SEND_FIELDS =
  'profile.first_name profile.last_name profile.city profile.state communication.whatsapp auth.phone';

/** The recipients themselves, with only the fields a send needs. Typed-in
 * contacts never touch the database — they ARE the recipients. */
export async function recipientUsers(audience: WaCampaignAudience, scope: RecipientScope = {}) {
  if (audience === 'MANUAL_NUMBERS') return manualUsers(scope.contacts ?? []);
  return UserModel.find(await recipientFilter(audience, scope))
    .select(SEND_FIELDS)
    .lean()
    .exec();
}

/** The accounts a "send to these people" picker offers: live users who carry a
 * number WhatsApp can be given, matched on name, email or number. Capped —
 * a picker is for choosing a few, and an audience list is for choosing many. */
export async function searchReachableUsers(search: string, limit = 20) {
  const term = str(search);
  if (term.length < 2) return [];
  const like = new RegExp(term.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
  const users = await UserModel.find({
    ...HAS_A_NUMBER,
    $and: [
      {
        $or: [
          { 'profile.first_name': like },
          { 'profile.last_name': like },
          { 'auth.email': like },
          { 'auth.phone.number': like },
          { 'communication.whatsapp.number': like },
        ],
      },
    ],
  })
    .select(SEND_FIELDS)
    .limit(limit)
    .lean()
    .exec();
  return users
    .map((user: any) => ({
      id: String(user._id),
      name: userNameFor(user),
      destination: destinationFor(user),
    }))
    .filter((option) => option.destination);
}

/** The same slim rows for a known set of people. A retry works from the
 * campaign's own recipient rows, not from the audience — re-resolving the
 * audience could pull in people the original send never touched. */
export async function usersByIds(ids: readonly unknown[]) {
  return UserModel.find({ _id: { $in: ids } })
    .select(SEND_FIELDS)
    .lean()
    .exec();
}
