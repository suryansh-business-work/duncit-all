/**
 * @duncit/breadcrumb — the shared, dynamic console breadcrumb.
 *
 * `<AppBreadcrumbs>` builds its trail from the current route + the portal's nav
 * tree; the shell chrome renders it once so every portal gets it. Pages can
 * override the generic id tail with real labels via `useSetBreadcrumbs`, as long
 * as a `<BreadcrumbProvider>` sits above them (the shell's `AppShell` mounts it).
 */
export { AppBreadcrumbs, type AppBreadcrumbsProps } from './AppBreadcrumbs';
export { BreadcrumbProvider, useSetBreadcrumbs } from './BreadcrumbContext';
export type { BreadcrumbNavItem, Crumb } from './types';
