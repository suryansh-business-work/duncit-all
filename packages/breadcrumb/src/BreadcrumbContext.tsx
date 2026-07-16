import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Crumb } from './types';

interface BreadcrumbContextValue {
  /** Page-provided trail overriding the tail of the auto breadcrumb, or null. */
  override: Crumb[] | null;
  setOverride: (crumbs: Crumb[] | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

/**
 * Holds the current page's dynamic breadcrumb override. Mount it above both the
 * `<AppBreadcrumbs>` and the routed pages (the shell's `AppShell` does this) so
 * any page can replace the generic id tail with real labels via
 * `useSetBreadcrumbs`.
 */
export function BreadcrumbProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [override, setOverride] = useState<Crumb[] | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/**
 * Read the active override — used internally by `<AppBreadcrumbs>`. Safe to call
 * outside a provider (returns null), so the breadcrumb simply falls back to the
 * route/nav trail.
 */
export function useBreadcrumbOverride(): Crumb[] | null {
  return useContext(BreadcrumbContext)?.override ?? null;
}

/**
 * Set dynamic breadcrumb labels for the current page — e.g. the real entity name
 * ("Acme Club") instead of the generic "Detail". Pass the trailing crumbs; they
 * replace the segments after the deepest matched nav item. The override is
 * cleared automatically when the page unmounts.
 */
export function useSetBreadcrumbs(crumbs: Crumb[] | null | undefined): void {
  const ctx = useContext(BreadcrumbContext);
  const key = crumbs && crumbs.length > 0 ? crumbs.map((c) => `${c.label}|${c.to ?? ''}`).join('>') : '';

  useEffect(() => {
    if (!ctx) return undefined;
    // `key` is non-empty only when `crumbs` is a non-empty array, so the
    // truthy branch never sees null/undefined (hence the non-null assertion).
    ctx.setOverride(key ? crumbs! : null);
    return () => ctx.setOverride(null);
    // `key` captures the crumbs' identity; `ctx.setOverride` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, key]);
}
