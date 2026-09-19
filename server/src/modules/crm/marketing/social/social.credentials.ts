import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getUrlConfigs } from '@config/url-configs';
import { trimTrailingSlash } from '@utils/url';
import {
  SOCIAL_PROVIDERS,
  type SocialAppCredentials,
  type SocialPlatform,
  type SocialProvider,
} from './social.types';

/**
 * The provider apps live in Tech → Environment Variables → Social apps, never
 * `.env`, and are read fresh on every use so a key Tech saves works on the
 * next click with no restart.
 */
interface AppFields {
  /** How Tech and Marketing name the app. */
  label: string;
  id: string;
  secret: string;
  version?: { field: string; fallback: string };
}

/**
 * The SOCIAL_APPS config fields per provider. The runtime env key is always
 * `SOCIAL_` + the field in capitals (see ENV_KEY_MAP), so this one table
 * serves both the running app and Tech's connection test.
 */
export const APP_FIELDS: Record<SocialProvider, AppFields> = {
  // LinkedIn sunsets an API version about a year after release; Tech bumps it
  // from the portal rather than waiting on a deploy.
  LINKEDIN: {
    label: 'LinkedIn',
    id: 'linkedin_client_id',
    secret: 'linkedin_client_secret',
    version: { field: 'linkedin_api_version', fallback: '202509' },
  },
  META: {
    label: 'Facebook + Instagram',
    id: 'meta_app_id',
    secret: 'meta_app_secret',
    version: { field: 'meta_graph_version', fallback: 'v23.0' },
  },
  X: { label: 'X', id: 'x_client_id', secret: 'x_client_secret' },
  YOUTUBE: { label: 'YouTube', id: 'youtube_client_id', secret: 'youtube_client_secret' },
};

type FieldReader = (field: string) => string | Promise<string>;

/**
 * Where every provider sends the browser back. ONE address for all four, so
 * Tech registers the same URL in each developer console; the signed `state`
 * says which provider is answering.
 */
export async function socialRedirectUri(): Promise<string> {
  const { serverUrl } = await getUrlConfigs();
  return `${trimTrailingSlash(serverUrl)}/social/callback`;
}

/** A provider's app from any source of the SOCIAL_APPS fields; null until both keys are there. */
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

/** A provider's app as the running server uses it — the active default Social apps entry. */
export async function socialCredentials(provider: SocialProvider): Promise<SocialAppCredentials | null> {
  const redirectUri = await socialRedirectUri();
  return credentialsFrom(provider, (field) => getRuntimeEnvValue(`SOCIAL_${field.toUpperCase()}`), redirectUri);
}

/** Which providers Marketing can offer a Connect button for right now. */
export async function providerReadiness(): Promise<{ provider: SocialProvider; configured: boolean }[]> {
  return Promise.all(
    SOCIAL_PROVIDERS.map(async (provider) => ({
      provider,
      configured: (await socialCredentials(provider)) !== null,
    }))
  );
}

/** The provider app a platform's account was connected through. */
export const PROVIDER_OF: Record<SocialPlatform, SocialProvider> = {
  LINKEDIN: 'LINKEDIN',
  FACEBOOK: 'META',
  INSTAGRAM: 'META',
  X: 'X',
  YOUTUBE: 'YOUTUBE',
};
