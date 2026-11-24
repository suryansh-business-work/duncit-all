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
 * provider. Nobody signs in and nothing is created — a Meta app gets an app
 * token, the others judge the client before a deliberately fake code.
 *
 * The callback URL the app must register is named only when the provider's
 * answer is about it; pinned to every answer it read as the cause of failures
 * it had nothing to do with.
 */
const REDIRECT_TROUBLE = /redirect|callback/i;

export function probeSocialApp(provider: SocialProvider): (str: EnvConfigReader) => Promise<EnvConnectionResult> {
  const { label, id, secret } = APP_FIELDS[provider];
  return async (str) => {
    const redirectUri = await socialRedirectUri();
    const detailsFor = (message: string) =>
      REDIRECT_TROUBLE.test(message) ? [`The ${label} app must list ${redirectUri} as a valid OAuth redirect URI.`] : [];
    const creds = await credentialsFrom(provider, str, redirectUri);
    if (!creds) return { ok: false, message: `${label}: fill in both ${id} and ${secret} first`, details: [] };
    try {
      const outcome = await PROBES[provider](creds);
      return { ok: outcome.ok, message: outcome.message, details: outcome.ok ? [] : detailsFor(outcome.message) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `${label}: could not reach the provider (${reason})`;
      return { ok: false, message, details: detailsFor(message) };
    }
  };
}
