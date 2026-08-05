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
 */
export function destinationFor(user: UserLike): string {
  const whatsapp = user.communication?.whatsapp;
  const source = digits(whatsapp?.number) ? whatsapp : user.auth?.phone;
  const number = digits(source?.number);
  const extension = digits(source?.extension);
  if (!number) return '';
  if (number.length > 10 && number.startsWith(extension)) return number;
  if (!extension) return '';
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

async function recipientFilter(audience: WaCampaignAudience, audienceListId?: unknown) {
  if (audience !== 'AUDIENCE_LIST') return HAS_A_NUMBER;
  const { audienceListService } = await import('./audienceList.service');
  const ids = await audienceListService.memberIds(String(audienceListId ?? ''));
  return { ...HAS_A_NUMBER, _id: { $in: ids } };
}

/** How many people this audience reaches right now. */
export async function countReachable(audience: WaCampaignAudience, audienceListId?: unknown) {
  return UserModel.countDocuments(await recipientFilter(audience, audienceListId));
}

/** Only the fields a send reads — a campaign has no business loading whole
 * user documents for an audience of thousands. */
const SEND_FIELDS =
  'profile.first_name profile.last_name profile.city profile.state communication.whatsapp auth.phone';

/** The recipients themselves, with only the fields a send needs. */
export async function recipientUsers(audience: WaCampaignAudience, audienceListId?: unknown) {
  return UserModel.find(await recipientFilter(audience, audienceListId))
    .select(SEND_FIELDS)
    .lean()
    .exec();
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
