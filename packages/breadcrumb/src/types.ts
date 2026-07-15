/**
 * A navigation entry the breadcrumb walks to build its trail. Structurally
 * compatible with the shell's `AppNavItem`, but declared locally so this package
 * carries no dependency back on `@duncit/shell`.
 */
export interface BreadcrumbNavItem {
  label: string;
  /** Route the item links to. Optional when the item is purely a group header. */
  to?: string;
  /** Optional nested children — walked recursively when building the trail. */
  children?: BreadcrumbNavItem[];
}

/** One rendered breadcrumb segment. A leaf crumb omits `to` (not a link). */
export interface Crumb {
  label: string;
  to?: string;
}
