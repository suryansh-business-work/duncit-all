import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { SocialCredential } from '@duncit/utils';

/**
 * Sign in with Apple, two ways, one answer.
 *
 * iOS has Apple's own sheet (`expo-apple-authentication`) and uses it — the
 * token it returns is issued to the App ID. Android and the web build have no
 * Apple sheet, so they run Apple's web flow in an auth session: Apple posts its
 * answer to the server's /apple/callback relay (a form post no app can
 * receive), which hands it back to APPLE_RETURN_PATH in the URL fragment.
 * Either way the page gets the same `SocialCredential`, or null when the
 * person backed out.
 */

const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize';

/** Where the relay hands the web flow's answer back — never a screen. */
export const APPLE_RETURN_PATH = 'apple-auth';

/** Whether a deep-link path is the web flow's answer coming back. */
export const isAppleAuthReturn = (path: string): boolean =>
  path.replace(/^\/+/, '').startsWith(APPLE_RETURN_PATH);

/** How this platform signs in with Apple. */
export type AppleRoute = 'NATIVE' | 'WEB';

export const appleRouteForPlatform = (): AppleRoute => (Platform.OS === 'ios' ? 'NATIVE' : 'WEB');

const credentialOf = (idToken: string, name: string): SocialCredential => ({
  provider: 'APPLE',
  idToken,
  ...(name ? { name } : {}),
});

/** Apple's sheet on iOS. */
async function signInNatively(): Promise<SocialCredential | null> {
  try {
    const result = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!result.identityToken) throw new Error('apple_no_identity_token');
    // Only the first authorisation carries a name; later ones leave it null.
    const name = [result.fullName?.givenName, result.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return credentialOf(result.identityToken, name);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}

/** The relay's answer, read out of the fragment it put it in. */
function answerOf(url: string): Map<string, string> {
  const fragment = url.split('#')[1] ?? '';
  const pairs = fragment
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const [key = '', value = ''] = pair.split('=');
      return [decodeURIComponent(key), decodeURIComponent(value.replaceAll('+', ' '))] as const;
    });
  return new Map(pairs);
}

/** Apple's web flow, through the server relay, for Android and the web build. */
async function signInOnTheWeb(
  servicesId: string,
  relayUrl: string,
): Promise<SocialCredential | null> {
  const returnUrl = Linking.createURL(APPLE_RETURN_PATH);
  const query = new URLSearchParams();
  query.set('client_id', servicesId);
  query.set('redirect_uri', relayUrl);
  query.set('response_type', 'code id_token');
  query.set('response_mode', 'form_post');
  query.set('scope', 'name email');
  // The relay only redirects to the app's own scheme or Duncit's own hosts.
  query.set('state', returnUrl);
  const result = await WebBrowser.openAuthSessionAsync(
    `${APPLE_AUTHORIZE_URL}?${query.toString()}`,
    returnUrl,
  );
  if (result.type !== 'success') return null;
  const answer = answerOf(result.url);
  const idToken = answer.get('id_token');
  if (idToken) return credentialOf(idToken, answer.get('name') ?? '');
  if (answer.get('error') === 'user_cancelled_authorize') return null;
  throw new Error(answer.get('error') ?? 'apple_no_id_token');
}

export interface AppleWebConfig {
  servicesId: string;
  relayUrl: string;
}

/** Sign in with Apple the way this platform can. Null means the person backed out. */
export function signInWithApple(web: AppleWebConfig): Promise<SocialCredential | null> {
  if (appleRouteForPlatform() === 'NATIVE') return signInNatively();
  return signInOnTheWeb(web.servicesId, web.relayUrl);
}
