/**
 * Centralised runtime configuration.
 * All values are sourced from environment variables / the Expo runtime — never
 * hardcoded business data.
 */
import Constants from 'expo-constants';
import { logs } from '@duncit/logs';

const LOCAL_API_PORT = 2001;
/** mWeb's dev-server port (app/mweb vite.config.ts). */
const LOCAL_WEB_PORT = 2003;

/** True for `localhost` / `127.0.0.1` origins, which a phone or emulator can't
 * reach (there `localhost` is the device itself, not the dev machine). */
function isLoopback(url?: string): boolean {
  return !url || /\/\/(localhost|127\.0\.0\.1)\b/i.test(url);
}

/**
 * Resolve the API origin (no trailing `/graphql`).
 *
 * - A non-loopback `EXPO_PUBLIC_API_URL` always wins — release builds load
 *   `.env.production` (`https://server.duncit.com`), so production is untouched.
 * - In dev, a bare `localhost` is replaced with the Metro bundler's LAN host
 *   (the IP the device already uses to load the JS) on port 2001, so Expo Go on
 *   a phone / emulator reaches the local API instead of failing with a network
 *   error. iOS simulators (where `localhost` works) fall through unchanged.
 */
function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit && !isLoopback(explicit)) return explicit;

  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost && !isLoopback(`//${metroHost}`)) {
    return `http://${metroHost}:${LOCAL_API_PORT}`;
  }

  return explicit ?? `http://localhost:${LOCAL_API_PORT}`;
}

const apiUrl = resolveApiUrl();

/**
 * The mWeb origin that belongs to THIS build — where a link the app hands out
 * (a pod, a rating form) should point.
 *
 * Derived from the API origin rather than hardcoded, because the two always
 * travel together: a local build must share a local link, a staging build a
 * staging one. A dev origin is the one carrying the API's port, so it keeps its
 * host and takes mWeb's port; a deployed origin only differs by its first
 * label (server.duncit.com ↔ mweb.duncit.com, staging included).
 */
function resolveWebUrl(): string {
  if (apiUrl.includes(`:${LOCAL_API_PORT}`)) {
    return apiUrl.replace(`:${LOCAL_API_PORT}`, `:${LOCAL_WEB_PORT}`);
  }
  return apiUrl.replace('server.', 'mweb.');
}

if (__DEV__) {
  // Visible in the logs so a network error is easy to diagnose.
  logs.mobileApp.info('config', 'resolveApiUrl', {
    msg: `API origin: ${apiUrl}`,
    apiUrl,
  });
}

export const config = {
  // graphql.client appends `/graphql`, so this is the bare origin only.
  apiUrl,
  // Where a link shared out of the app points — see resolveWebUrl.
  webUrl: resolveWebUrl(),
  endpoints: {
    location: '/api/location',
  },
  // OAuth client id for Google sign-in. Must match the server's GOOGLE_CLIENT_ID
  // so the verified id_token audience lines up.
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
  // Google Maps key for the interactive location map (Maps Embed API). Mirrors
  // mWeb's VITE_GOOGLE_MAP_API; the map degrades to nothing when unset.
  googleMapApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAP_API ?? '',
  /**
   * How long one attempt may take before the client gives up.
   *
   * 15s was below the real cost of a cold first load on a mobile radio — DNS,
   * TLS and a full home feed — so the app reported "Request timed out" for
   * requests the server went on to answer successfully. The server-side fan-out
   * that made those requests slow is fixed; this is the headroom that stops a
   * merely-slow network from reading as a failure. It stays finite on purpose:
   * a request nobody can answer must still end, and the server now hears the
   * disconnect and abandons the work rather than finishing it for nobody.
   */
  requestTimeoutMs: 30_000,
} as const;

export type AppConfig = typeof config;
