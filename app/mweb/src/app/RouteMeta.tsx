import { useLocation } from 'react-router';
import { usePageMeta } from '@duncit/app-settings';

import { DYNAMIC_ROUTES, STATIC_ROUTES, matchPattern } from '../../server/meta-routes';
import { useTranslation } from '../i18n/useTranslation';
import { appNameFromDocument } from './pageMeta';

const DEFAULT_DESCRIPTION_KEY = 'mweb.meta.defaultDescription';

/**
 * Keeps the tab naming the page you are actually on.
 *
 * mWeb renders `<title>` server-side per request (server/page-meta.ts), which is
 * what a crawler reads and what the first paint shows. React Router then moves
 * between pages without reloading the document, so nothing reset that title —
 * every navigation left the tab naming whichever page the server had rendered.
 *
 * This mirrors `resolvePageMeta` on the client, off the SAME route table, so the
 * two can never disagree about what a path is called. A dynamic route resolves
 * its entity name asynchronously, so it gets the server's own fallback (the bare
 * app name) until the detail page refines it with `useEntityPageMeta`.
 */
export default function RouteMeta() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const appName = appNameFromDocument();

  const dynamic = DYNAMIC_ROUTES.find((route) => matchPattern(route.pattern, pathname));
  const staticRoute = dynamic
    ? undefined
    : STATIC_ROUTES.find((route) => matchPattern(route.pattern, pathname));

  const title = staticRoute ? t(staticRoute.titleKey) : appName;
  const descriptionKey =
    staticRoute?.descriptionKey ?? dynamic?.descriptionKey ?? DEFAULT_DESCRIPTION_KEY;

  usePageMeta({ title, description: t(descriptionKey), appName });
  return null;
}
