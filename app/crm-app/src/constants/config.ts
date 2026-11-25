/**
 * Runtime configuration. The API origin is baked in at build time
 * (EXPO_PUBLIC_API_URL: CI sets staging or production by branch); nothing
 * here is business data.
 */
const DEFAULT_API = 'https://staging.server.duncit.com';

/** The API origin without a trailing slash or `/graphql`. */
export function resolveApiUrl(raw: string | undefined): string {
  const value = (raw ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/graphql$/, '');
  return value || DEFAULT_API;
}

/**
 * The CRM portal for the server this build talks to (staging.crm… for the
 * staging server, crm… otherwise) — worked out from the API origin, so no
 * extra build setting can point the two at different environments.
 */
export function portalOrigin(apiUrl: string): string {
  // Not URL().hostname: React Native's URL does not implement it on every version.
  const staging = (apiUrl.split('//')[1] ?? '').startsWith('staging.');
  return staging ? 'https://staging.crm.duncit.com' : 'https://crm.duncit.com';
}

export const config = {
  apiUrl: resolveApiUrl(process.env.EXPO_PUBLIC_API_URL),
  portalUrl: portalOrigin(resolveApiUrl(process.env.EXPO_PUBLIC_API_URL)),
  /** Per-attempt timeout for a GraphQL request. */
  requestTimeoutMs: 20_000,
  /** The console key the CRM portal signs in with: same gate, same Security Verification. */
  portalKey: 'crm',
  /** Who may use the app: the same roles the CRM portal requires. */
  allowedRoles: ['CRM_MANAGER', 'SUPER_ADMIN'] as readonly string[],
  /** The sign-in backdrop: the CRM portal's own login photo (its appConfig.loginImage), sized for a phone. */
  loginImage:
    'https://images.pexels.com/photos/7658434/pexels-photo-7658434.jpeg?auto=compress&w=1080',
} as const;
