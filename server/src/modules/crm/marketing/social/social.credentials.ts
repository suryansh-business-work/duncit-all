import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import type { EnvCategory } from '@modules/platform/envEntry/envEntry.model';
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
  },
  FACEBOOK: {
    label: 'Facebook',
    category: 'SOCIAL_FACEBOOK',
    id: 'app_id',
    secret: 'app_secret',
    version: { field: 'graph_version', fallback: 'v23.0' },
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
  const [clientId, clientSecret, version] = await Promise.all([
    read(fields.id),
    read(fields.secret),
    fields.version ? read(fields.version.field) : '',
  ]);
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri, version: version || fields.version?.fallback || '' };
}

/** A provider's app as the running server uses it — the active default entry of its category. */
export async function socialCredentials(provider: SocialProvider): Promise<SocialAppCredentials | null> {
  const redirectUri = await socialRedirectUri();
  return credentialsFrom(provider, (field) => getRuntimeEnvValue(socialEnvKey(provider, field)), redirectUri);
}

/** Which providers Marketing can offer a Connect button for right now, and where each one's app is set up. */
export async function providerReadiness(): Promise<{ provider: SocialProvider; configured: boolean; category: EnvCategory }[]> {
  return Promise.all(
    SOCIAL_PROVIDERS.map(async (provider) => ({
      provider,
      configured: (await socialCredentials(provider)) !== null,
      category: APP_FIELDS[provider].category,
    }))
  );
}
