/**
 * Runtime configuration. The API origin is baked in at build time
 * (EXPO_PUBLIC_API_URL: CI sets staging or production by branch); nothing
 * here is business data.
 */
const DEFAULT_API = 'https://staging.server.duncit.com';

const GRAPHQL_PATH = '/graphql';

/** The value without the slashes it ends in (a loop: no regex to backtrack on a long run). */
function withoutTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;
  return value.slice(0, end);
}

/** The API origin without a trailing slash or `/graphql`. */
export function resolveApiUrl(raw: string | undefined): string {
  const trimmed = withoutTrailingSlashes((raw ?? '').trim());
  const value = trimmed.endsWith(GRAPHQL_PATH) ? trimmed.slice(0, -GRAPHQL_PATH.length) : trimmed;
  return value || DEFAULT_API;
}

/**
 * A console for the server this build talks to (staging.<console>… for the
 * staging server, <console>… otherwise) — worked out from the API origin, so
 * no extra build setting can point the two at different environments.
 */
export function portalOrigin(apiUrl: string, consoleKey = 'crm'): string {
  // Not URL().hostname: React Native's URL does not implement it on every version.
  const staging = (apiUrl.split('//')[1] ?? '').startsWith('staging.');
  return `https://${staging ? 'staging.' : ''}${consoleKey}.duncit.com`;
}

export const config = {
  apiUrl: resolveApiUrl(process.env.EXPO_PUBLIC_API_URL),
  /** The CRM portal, which hosts the public survey page a lead's survey link opens. */
  portalUrl: portalOrigin(resolveApiUrl(process.env.EXPO_PUBLIC_API_URL)),
  /** The Tech portal, where Twilio (the CRM call line) is configured. */
  techUrl: portalOrigin(resolveApiUrl(process.env.EXPO_PUBLIC_API_URL), 'tech'),
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
