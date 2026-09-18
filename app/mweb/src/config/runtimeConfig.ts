/**
 * Public client config (Google OAuth client id, Maps key, Sign in with Apple
 * identifiers) fetched once from the server at bootstrap — the server resolves
 * it from the Tech portal's GOOGLE_OAUTH / GOOGLE_MAPS / APPLE_SIGNIN
 * categories, so nothing is hardcoded in the frontend.
 *
 * The build-time Vite env is used only as a local-dev / offline fallback for
 * Google; the server value wins whenever it is non-empty. Apple has no such
 * fallback: its web flow only answers on a registered https Return URL, so it
 * cannot run on a local dev host anyway.
 */
export interface RuntimeClientConfig {
  googleClientId: string;
  googleMapsApiKey: string;
  /** Apple's Services ID — blank means no Apple button. */
  appleServicesId: string;
  /** The Return URL registered under that Services ID. */
  appleWebRedirectUri: string;
}

let current: RuntimeClientConfig = {
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '',
  googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAP_API as string | undefined)?.trim() || '',
  appleServicesId: '',
  appleWebRedirectUri: '',
};

const listeners = new Set<() => void>();

/** Merge server-provided values over the fallback (empty values are ignored). */
export function setRuntimeConfig(next: Partial<RuntimeClientConfig>): void {
  current = {
    googleClientId: next.googleClientId?.trim() || current.googleClientId,
    googleMapsApiKey: next.googleMapsApiKey?.trim() || current.googleMapsApiKey,
    appleServicesId: next.appleServicesId?.trim() || current.appleServicesId,
    appleWebRedirectUri: next.appleWebRedirectUri?.trim() || current.appleWebRedirectUri,
  };
  listeners.forEach((listener) => listener());
}

/**
 * Hear about the server's values landing. First paint does not wait for them,
 * so anything rendered from this config re-renders when they arrive.
 */
export function subscribeRuntimeConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getRuntimeConfig = (): RuntimeClientConfig => current;
export const getGoogleClientId = (): string => current.googleClientId;
export const getGoogleMapsApiKey = (): string => current.googleMapsApiKey;
