/**
 * Public client config (Google OAuth client id + Maps key) fetched once from the
 * server at bootstrap — the server resolves it from the Tech portal's
 * GOOGLE_OAUTH / GOOGLE_MAPS categories, so nothing is hardcoded in the frontend.
 *
 * The build-time Vite env is used only as a local-dev / offline fallback; the
 * server value wins whenever it is non-empty.
 */
export interface RuntimeClientConfig {
  googleClientId: string;
  googleMapsApiKey: string;
}

let current: RuntimeClientConfig = {
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '',
  googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAP_API as string | undefined)?.trim() || '',
};

/** Merge server-provided values over the fallback (empty values are ignored). */
export function setRuntimeConfig(next: Partial<RuntimeClientConfig>): void {
  current = {
    googleClientId: next.googleClientId?.trim() || current.googleClientId,
    googleMapsApiKey: next.googleMapsApiKey?.trim() || current.googleMapsApiKey,
  };
}

export const getGoogleClientId = (): string => current.googleClientId;
export const getGoogleMapsApiKey = (): string => current.googleMapsApiKey;
