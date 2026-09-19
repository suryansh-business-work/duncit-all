import type { EnvConfigReader, EnvConnectionResult } from '@modules/platform/envEntry/envEntry.connection';
import { PROBES } from './providers';
import { APP_FIELDS, credentialsFrom, socialRedirectUri } from './social.credentials';
import { SOCIAL_PROVIDERS, type ProbeOutcome, type SocialProvider } from './social.types';

/**
 * Tech → Environment Variables → Social apps → Test connection.
 *
 * Each app whose ID and secret are filled in is put in front of its provider
 * — the keys typed into THIS entry, not whatever is saved as the default —
 * and each answers for itself in the details. Nobody signs in and nothing is
 * created: Meta issues an app token, the other three judge the client before
 * a deliberately fake code.
 */
async function probeOne(provider: SocialProvider, str: EnvConfigReader, redirectUri: string): Promise<ProbeOutcome | null> {
  const creds = await credentialsFrom(provider, str, redirectUri);
  if (!creds) return null;
  try {
    return await PROBES[provider](creds);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `${APP_FIELDS[provider].label}: could not reach the provider (${reason})` };
  }
}

export async function probeSocialApps(str: EnvConfigReader): Promise<EnvConnectionResult> {
  const redirectUri = await socialRedirectUri();
  const outcomes = await Promise.all(SOCIAL_PROVIDERS.map((provider) => probeOne(provider, str, redirectUri)));
  const details = outcomes.map((outcome, index) => outcome?.message ?? `${APP_FIELDS[SOCIAL_PROVIDERS[index]].label}: not set up.`);
  details.push(`Every app must list ${redirectUri} as its redirect (callback) URL.`);

  const tested = outcomes.filter((outcome) => outcome !== null);
  const rejected = tested.filter((outcome) => !outcome.ok).length;
  if (tested.length === 0) return { ok: false, message: 'No social app has both its ID and secret yet', details };
  if (rejected > 0) return { ok: false, message: `${rejected} of ${tested.length} social apps were rejected`, details };
  return { ok: true, message: `${tested.length} of ${SOCIAL_PROVIDERS.length} social apps are ready to connect`, details };
}
