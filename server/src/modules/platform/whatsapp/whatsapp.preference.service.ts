import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { destinationFor } from '@modules/crm/marketing/waCampaign.recipients';
import {
  WA_EVENTS,
  WA_OPTIONAL_CATEGORIES,
  WA_REQUIRED_CATEGORIES,
  isRequiredWaCategory,
} from './whatsapp.events';
import { WaPreferenceEventModel, WaPreferenceModel } from './waPreference.model';

/**
 * What a person sees on their own WhatsApp settings screen, and what happens
 * when they flip a switch.
 *
 * The sheet is built from the CATEGORIES that scenarios actually use, not from
 * the full enum: a category no message is wired to would be a switch that does
 * nothing, which is worse than no switch.
 *
 * The server ships category KEYS and never labels — both apps localize them
 * (rule 38), exactly as `MailPreferenceCategory` already does.
 */

/** Only categories some scenario really sends, so no switch is decorative. */
const IN_USE = new Set(WA_EVENTS.map((event) => event.category));

const optional = () => WA_OPTIONAL_CATEGORIES.filter((category) => IN_USE.has(category));
const required = () => WA_REQUIRED_CATEGORIES.filter((category) => IN_USE.has(category));

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

interface Sheet {
  destination: string;
  /** Whether a message could reach this person at all. Both apps render a
   * "add your WhatsApp number" state off this rather than re-deriving it —
   * `destinationFor` lives in `server/src` and cannot be shared. */
  reachable: boolean;
  categories: { category: string; required: boolean; enabled: boolean }[];
  updated_at: string | null;
}

function sheetFrom(destination: string, optedOut: readonly string[], updatedAt?: Date | null): Sheet {
  const rows = [
    ...required().map((category) => ({ category, required: true, enabled: true })),
    ...optional().map((category) => ({
      category,
      required: false,
      enabled: !optedOut.includes(category),
    })),
  ];
  return {
    destination,
    reachable: Boolean(destination),
    categories: rows,
    updated_at: updatedAt?.toISOString() ?? null,
  };
}

/** The number this account would be messaged on, or '' when there is none. */
async function destinationOf(userId: string): Promise<string> {
  const user = await UserModel.findById(userId)
    .select('auth.phone communication.whatsapp')
    .lean();
  return user ? destinationFor(user) : '';
}

/**
 * One shared write for both "flip a category" and "flip everything".
 *
 * `$addToSet` / `$pullAll` upsert rather than read-modify-write, so two devices
 * toggling at once cannot lose one of the changes.
 */
async function apply(
  destination: string,
  userId: string | null,
  categories: readonly string[],
  enabled: boolean
): Promise<Sheet> {
  const update = enabled
    ? { $pullAll: { opted_out: [...categories] } }
    : { $addToSet: { opted_out: { $each: [...categories] } } };
  const doc = await WaPreferenceModel.findOneAndUpdate(
    { destination },
    { ...update, $set: { user_id: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  await WaPreferenceEventModel.insertMany(
    categories.map((category) => ({ destination, user_id: userId, category, enabled }))
  ).catch((error) => logs.server.warn('whatsapp', 'preferenceEvent', { error, destination }));

  return sheetFrom(destination, doc?.opted_out ?? [], doc?.updated_at);
}

export const whatsappPreferenceService = {
  async mine(userId: string): Promise<Sheet> {
    const destination = await destinationOf(userId);
    // No number yet: the switches still render, so somebody can set their
    // preference before adding a number rather than after being messaged.
    if (!destination) return sheetFrom('', []);
    const doc = await WaPreferenceModel.findOne({ destination }).lean();
    return sheetFrom(destination, doc?.opted_out ?? [], doc?.updated_at);
  },

  async setMine(userId: string, category: string, enabled: boolean): Promise<Sheet> {
    if (isRequiredWaCategory(category)) {
      throw badInput('This kind of message cannot be switched off');
    }
    if (!optional().includes(category as never)) throw badInput('Unknown message type');
    const destination = await destinationOf(userId);
    if (!destination) throw badInput('Add your WhatsApp number first');
    return apply(destination, userId, [category], enabled);
  },

  async setAllMine(userId: string, enabled: boolean): Promise<Sheet> {
    const destination = await destinationOf(userId);
    if (!destination) throw badInput('Add your WhatsApp number first');
    return apply(destination, userId, optional(), enabled);
  },
};
