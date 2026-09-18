import { useEffect, useState, useSyncExternalStore } from 'react';
import { logs } from '@duncit/logs';
import type { SocialCredential } from '@duncit/utils';
import { getRuntimeConfig, subscribeRuntimeConfig } from '../../config/runtimeConfig';

/**
 * Apple's JS SDK for Sign in with Apple, loaded once, on demand.
 *
 * Apple has no npm SDK for the web; its own script is the supported way in.
 * It runs the popup and hands back the id_token — and, on the first
 * authorisation only, the person's name — which the page spends on
 * loginWithApple / signupWithApple like any other credential.
 */
const APPLE_JS_URL =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

interface AppleSignInResponse {
  authorization: { id_token: string };
  user?: { name?: { firstName?: string; lastName?: string } };
}

export interface AppleIdAuth {
  init: (config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
  }) => void;
  signIn: () => Promise<AppleSignInResponse>;
}

let loading: Promise<AppleIdAuth> | null = null;

function loadAppleJs(): Promise<AppleIdAuth> {
  loading ??= new Promise<AppleIdAuth>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = APPLE_JS_URL;
    script.async = true;
    script.onload = () => {
      const auth = (globalThis as { AppleID?: { auth?: AppleIdAuth } }).AppleID?.auth;
      if (auth) resolve(auth);
      else reject(new Error('Apple sign-in script loaded without AppleID'));
    };
    script.onerror = () => {
      // A later mount may try again — a dropped connection is not permanent.
      loading = null;
      reject(new Error('Apple sign-in script failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** The Apple identifiers from the public config, re-read when the server's land. */
export function useAppleWebConfig() {
  const config = useSyncExternalStore(subscribeRuntimeConfig, getRuntimeConfig);
  return { servicesId: config.appleServicesId, redirectUri: config.appleWebRedirectUri };
}

/**
 * The SDK, loaded and initialised for this Services ID — or null until it is.
 *
 * Loaded when the button MOUNTS, not when it is pressed: Apple opens a popup,
 * and a popup opened after an async gap is one the browser blocks. The press
 * then calls `signIn()` straight away, inside the click.
 */
export function useAppleJs(servicesId: string, redirectUri: string): AppleIdAuth | null {
  const [auth, setAuth] = useState<AppleIdAuth | null>(null);
  useEffect(() => {
    if (!servicesId || !redirectUri) return undefined;
    let live = true;
    loadAppleJs()
      .then((loaded) => {
        loaded.init({ clientId: servicesId, scope: 'name email', redirectURI: redirectUri, usePopup: true });
        if (live) setAuth(loaded);
      })
      .catch((error: unknown) => {
        logs.mWeb.error('AppleSignIn', 'loadAppleJs', { error, msg: 'Apple JS failed to load' });
      });
    return () => {
      live = false;
    };
  }, [servicesId, redirectUri]);
  return auth;
}

/** What Apple's popup answers when the person closed it — a cancel, not a failure. */
const CANCELLED = new Set(['popup_closed_by_user', 'user_cancelled_authorize']);

export const isAppleCancel = (error: unknown): boolean =>
  CANCELLED.has(String((error as { error?: unknown } | null)?.error ?? ''));

/** Apple's answer as the credential the page spends. */
export function appleCredentialOf(response: AppleSignInResponse): SocialCredential {
  const name = [response.user?.name?.firstName, response.user?.name?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    provider: 'APPLE',
    idToken: response.authorization.id_token,
    ...(name ? { name } : {}),
  };
}
