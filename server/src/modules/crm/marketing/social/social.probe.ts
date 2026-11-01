import type { EnvConfigReader, EnvConnectionResult } from '@modules/platform/envEntry/envEntry.connection';
import { PROBES } from './providers';
import { APP_FIELDS, credentialsFrom, socialRedirectUri } from './social.credentials';
import type { SocialProvider } from './social.types';

/**
 * Marketing → Settings → Integrations → <network> → Test connection (and the
 * same button in Tech → Environment Variables).
 *
 * One entry per network, so one probe per entry: the keys typed into THIS
 * entry, not whatever is saved as the default, are put in front of the
 * provider. Nobody signs in and nothing is created — Facebook issues an app
 * token, the others judge the client before a deliberately fake code.
 */
export function probeSocialApp(provider: SocialProvider): (str: EnvConfigReader) => Promise<EnvConnectionResult> {
  const { label, id, secret } = APP_FIELDS[provider];
  return async (str) => {
    const redirectUri = await socialRedirectUri();
    const details = [`The ${label} app must list ${redirectUri} as its redirect (callback) URL.`];
    const creds = await credentialsFrom(provider, str, redirectUri);
    if (!creds) return { ok: false, message: `${label}: fill in both ${id} and ${secret} first`, details };
    try {
      const outcome = await PROBES[provider](creds);
      return { ok: outcome.ok, message: outcome.message, details };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `${label}: could not reach the provider (${reason})`, details };
    }
  };
}
