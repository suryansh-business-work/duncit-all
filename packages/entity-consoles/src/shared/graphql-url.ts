/**
 * Where this console talks to.
 *
 * The second seam out of the admin portal: `meeting-platforms.ts` read
 * `urlConfigs.graphqlUrl` from admin's own config. The rule is identical in
 * every surface — localhost in dev, the production server otherwise, with
 * `VITE_GRAPHQL_URL` overriding both (which is what the Cypress e2e build
 * uses) — so it is stated once here instead of imported from whichever portal
 * happens to be mounting the screen.
 */
const envUrl = (value: unknown): string => (typeof value === 'string' ? value : '');

export function resolveGraphqlUrl(): string {
  const fallback = import.meta.env.DEV
    ? 'http://localhost:2001/graphql'
    : 'https://server.duncit.com/graphql';
  return envUrl(import.meta.env.VITE_GRAPHQL_URL) || fallback;
}
