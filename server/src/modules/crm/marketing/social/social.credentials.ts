import { Types, isValidObjectId } from 'mongoose';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import { EnvEntryModel, type EnvCategory } from '@modules/platform/envEntry/envEntry.model';
import { trimTrailingSlash } from '@utils/url';
import { SOCIAL_PROVIDERS, type SocialAppCredentials, type SocialProvider } from './social.types';

/**
 * Every network's app has its own credential entry — Marketing → Settings →
 * Integrations keeps one per network (Instagram, Facebook and Threads are three
 * entries, never one Meta app), and the keys are read fresh on every use so a
 * key saved there works on the next click with no restart.
 */
interface AppFields {
  /** How the settings page and the Social Accounts page name the app. */
  label: string;
  /** The environment category the entry lives in. */
  category: EnvCategory;
  id: string;
  secret: string;
  version?: { field: string; fallback: string };
  /** The Login for Business configuration ID field, on the apps that connect through Facebook Login. */
  config?: string;
}

/**
 * The config fields per provider. The runtime env key is always
 * `SOCIAL_<PROVIDER>_<FIELD>` in capitals (see ENV_KEY_MAP), so this one table
 * serves both the running app and the settings page's connection test.
 */
export const APP_FIELDS: Record<SocialProvider, AppFields> = {
  INSTAGRAM: {
    label: 'Instagram',
    category: 'SOCIAL_INSTAGRAM',
    id: 'app_id',
    secret: 'app_secret',
    version: { field: 'graph_version', fallback: 'v23.0' },
    config: 'login_config_id',
  },
  FACEBOOK: {
    label: 'Facebook',
    category: 'SOCIAL_FACEBOOK',
    id: 'app_id',
    secret: 'app_secret',
    version: { field: 'graph_version', fallback: 'v23.0' },
    config: 'login_config_id',
  },
  THREADS: {
    label: 'Threads',
    category: 'SOCIAL_THREADS',
    id: 'app_id',
    secret: 'app_secret',
    version: { field: 'graph_version', fallback: 'v1.0' },
  },
  YOUTUBE: { label: 'YouTube', category: 'SOCIAL_YOUTUBE', id: 'client_id', secret: 'client_secret' },
  // LinkedIn sunsets an API version about a year after release; it is bumped
  // from the settings page rather than waiting on a deploy.
  LINKEDIN: {
    label: 'LinkedIn',
    category: 'SOCIAL_LINKEDIN',
    id: 'client_id',
    secret: 'client_secret',
    version: { field: 'api_version', fallback: '202509' },
  },
  X: { label: 'X', category: 'SOCIAL_X', id: 'client_id', secret: 'client_secret' },
};

/** The environment categories the social apps live in, one per network. */
export const SOCIAL_ENV_CATEGORIES: readonly EnvCategory[] = SOCIAL_PROVIDERS.map((provider) => APP_FIELDS[provider].category);

/** The provider whose app an environment category holds, or null for any other category. */
export function providerOfCategory(category: string): SocialProvider | null {
  return SOCIAL_PROVIDERS.find((provider) => APP_FIELDS[provider].category === category) ?? null;
}

/** The runtime env key one provider's config field resolves through. */
export const socialEnvKey = (provider: SocialProvider, field: string) => `SOCIAL_${provider}_${field.toUpperCase()}`;

type FieldReader = (field: string) => string | Promise<string>;

/**
 * Where every provider sends the browser back. ONE address for all of them,
 * so the same URL is registered in each developer console; the signed `state`
 * says which provider is answering.
 */
export async function socialRedirectUri(): Promise<string> {
  const { serverUrl } = await getUrlConfigs();
  return `${trimTrailingSlash(serverUrl)}/social/callback`;
}

/** A provider's app from any source of its config fields; null until both keys are there. */
export async function credentialsFrom(
  provider: SocialProvider,
  read: FieldReader,
  redirectUri: string
): Promise<SocialAppCredentials | null> {
  const fields = APP_FIELDS[provider];
  const [clientId, clientSecret, version, configId] = await Promise.all([
    read(fields.id),
    read(fields.secret),
    fields.version ? read(fields.version.field) : '',
    fields.config ? read(fields.config) : '',
  ]);
  if (!clientId || !clientSecret) return null;
  const creds: SocialAppCredentials = { clientId, clientSecret, redirectUri, version: version || fields.version?.fallback || '' };
  return fields.config ? { ...creds, configId: configId.trim() } : creds;
}

/** Reads one entry's stored config the way `credentialsFrom` asks for fields. */
const configReader =
  (config: unknown) =>
  (field: string): string => {
    const raw = (config as Record<string, unknown> | null | undefined)?.[field];
    return typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
  };

/** An id stored on an account (ObjectId or string), or '' when there is none. */
const entryIdOf = (entryId: unknown): string => {
  if (typeof entryId === 'string') return entryId.trim();
  return entryId instanceof Types.ObjectId ? entryId.toHexString() : '';
};

/**
 * A provider's app as the running server uses it. With no entry id it is the
 * active default entry of its category (accounts connected before apps could
 * be chosen carry none). With one, it is that entry — and only while it is
 * active and belongs to this provider's category, so an id from another
 * category, or a switched-off app, never lends its keys.
 *
 * Tokens are bound to the app that issued them, so every read, refresh, post
 * and message for an account goes through the entry it was connected with.
 */
export async function socialCredentials(provider: SocialProvider, entryId?: unknown): Promise<SocialAppCredentials | null> {
  const redirectUri = await socialRedirectUri();
  const id = entryIdOf(entryId);
  if (!id) return credentialsFrom(provider, (field) => getRuntimeEnvValue(socialEnvKey(provider, field)), redirectUri);
  if (!isValidObjectId(id)) return null;
  const entry = await EnvEntryModel.findOne({ _id: id, category: APP_FIELDS[provider].category, is_active: true }).select('config').lean();
  return entry ? credentialsFrom(provider, configReader(entry.config), redirectUri) : null;
}

/** One app a marketer can connect through: a named, active, complete entry. */
export interface SocialAppOption {
  id: string;
  name: string;
  is_default: boolean;
}

/**
 * Which providers Marketing can offer a Connect button for right now, where
 * each one's app is set up, and every app it can connect through — a category
 * may hold several entries (a second Meta app for another brand, a second
 * LinkedIn app), each added and tested in Tech › Environment Variables or
 * Marketing › Settings › Integrations. Only the id and name leave the server.
 */
export async function providerReadiness(): Promise<
  { provider: SocialProvider; configured: boolean; category: EnvCategory; apps: SocialAppOption[] }[]
> {
  const redirectUri = await socialRedirectUri();
  const entries = await EnvEntryModel.find({ category: { $in: SOCIAL_ENV_CATEGORIES }, is_active: true })
    .select('name category is_default config')
    .sort({ is_default: -1, name: 1 })
    .lean();
  return Promise.all(
    SOCIAL_PROVIDERS.map(async (provider) => {
      const { category } = APP_FIELDS[provider];
      const mine = entries.filter((entry) => entry.category === category);
      const complete = await Promise.all(mine.map((entry) => credentialsFrom(provider, configReader(entry.config), redirectUri)));
      const apps = mine
        .filter((_entry, index) => complete[index] !== null)
        .map((entry) => ({ id: String(entry._id), name: entry.name, is_default: !!entry.is_default }));
      return { provider, configured: apps.length > 0, category, apps };
    })
  );
}

/** The Meta apps whose events (DMs and comments) arrive by webhook. */
const META_WEBHOOK_PROVIDERS = ['INSTAGRAM', 'FACEBOOK'] as const satisfies readonly SocialProvider[];

/**
 * Every active Meta app's webhook secret and verify token. Meta signs each
 * delivery with the secret of the app the Page is subscribed through, so a
 * Page connected through a second app is signed with that app's secret.
 */
export async function metaWebhookKeys(): Promise<{ secrets: string[]; verifyTokens: string[] }> {
  const categories = META_WEBHOOK_PROVIDERS.map((provider) => APP_FIELDS[provider].category);
  const entries = await EnvEntryModel.find({ category: { $in: categories }, is_active: true }).select('config').lean();
  const pick = (field: string) => entries.map((entry) => configReader(entry.config)(field).trim()).filter(Boolean);
  return { secrets: pick('app_secret'), verifyTokens: pick('webhook_verify_token') };
}
