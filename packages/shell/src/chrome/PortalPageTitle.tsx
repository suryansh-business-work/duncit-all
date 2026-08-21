import { usePageMeta } from '@duncit/app-settings';
import {
  ID_CRUMB_LABEL,
  useBreadcrumbOverride,
  useCrumbs,
  type BreadcrumbNavItem,
} from '@duncit/breadcrumb';

export interface PortalPageTitleProps {
  nav: BreadcrumbNavItem[];
  /** Portal short name — the root crumb, e.g. "Support". */
  shortName: string;
  /** Full product name the title is suffixed with, e.g. "Duncit Support". */
  appName: string;
  labelMap?: Record<string, string>;
}

/**
 * Names the browser tab after the page being shown, for every portal at once.
 *
 * A portal is a client-routed SPA with one static `<title>` in its index.html,
 * so all of its pages shared a single tab name — 306 routes across the consoles
 * all reading "Duncit Admin". The trail the breadcrumb already computes from the
 * portal's own `nav` is exactly the answer, so the title is derived from it
 * rather than from a second table somebody would have to keep in step.
 *
 * Opaque id segments collapse to `ID_CRUMB_LABEL`, which names no page, so the
 * title walks back to the nearest real label — a ticket reads "Tickets", not
 * "Detail". A page that knows its subject can say so with `useSetBreadcrumbs`,
 * and the title follows automatically.
 */
export default function PortalPageTitle({
  nav,
  shortName,
  appName,
  labelMap,
}: Readonly<PortalPageTitleProps>) {
  const override = useBreadcrumbOverride();
  const crumbs = useCrumbs({ nav, appName: shortName, labelMap, override });

  const named = crumbs.filter((crumb) => crumb.label !== ID_CRUMB_LABEL);
  const leaf = named[named.length - 1];
  // The root crumb carries the short name; suffixing it would read
  // "Support | Duncit Support", so the landing page is just the product name.
  const title = !leaf || leaf.label === shortName ? appName : leaf.label;

  usePageMeta({ title, appName });
  return null;
}
