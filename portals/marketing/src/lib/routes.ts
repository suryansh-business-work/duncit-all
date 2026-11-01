/**
 * The console's own addresses that more than one page links to. Written once
 * here so a page that sends someone to Settings cannot drift from the route
 * table in App.tsx.
 */
export const INTEGRATIONS_PATH = '/settings/integrations';

/** The Integrations page, opened on one provider's tab (an environment category such as SOCIAL_INSTAGRAM). */
export function integrationsPath(category?: string | null): string {
  return category ? `${INTEGRATIONS_PATH}?selectedtab=${encodeURIComponent(category)}` : INTEGRATIONS_PATH;
}
