/**
 * Centralised runtime configuration.
 * All values are sourced from environment variables / the Expo runtime — never
 * hardcoded business data.
 */
import Constants from 'expo-constants';

const LOCAL_API_PORT = 2001;

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

if (__DEV__) {
  // Visible in the Metro logs so a network error is easy to diagnose.
  // eslint-disable-next-line no-console
  console.log(`[config] API origin: ${apiUrl}`);
}

export const config = {
  // graphql.client appends `/graphql`, so this is the bare origin only.
  apiUrl,
  endpoints: {
    location: '/api/location',
  },
  // OAuth client id for Google sign-in. Must match the server's GOOGLE_CLIENT_ID
  // so the verified id_token audience lines up.
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
  requestTimeoutMs: 15_000,
} as const;

export type AppConfig = typeof config;
