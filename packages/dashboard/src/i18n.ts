import { flattenCatalogue, SHELL_BUNDLE } from '@duncit/app-settings';

/**
 * The dashboard's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Its copy lives under `shell.dashboard.*` in SHELL_BUNDLE rather than in a
 * namespace of its own: every console already ships the shell bundle and layers
 * it through `mountPortal`, so putting the grid's toolbar there means one set
 * of keys serves all seventeen consoles with no per-portal wiring.
 */
export const DASHBOARD_FALLBACK_FLAT = flattenCatalogue(SHELL_BUNDLE);
