import { createBundleTranslation, TABS_BUNDLE } from '@duncit/app-settings';

/**
 * Translate inside the tab strip (CLAUDE.md rule 38).
 *
 * This package's copy is layered OVER the host surface's rather than left to
 * it: mWeb mounts `mweb.*`, a portal mounts the shell's, and neither knows
 * `tabs.*` — so without this the search box would render its own key as its
 * placeholder on whichever surface forgot to spread the bundle. The twin of
 * @duncit/ui's `useTranslation`, for the same reason.
 */
export const useTranslation = createBundleTranslation(TABS_BUNDLE);

/** The `t` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];
