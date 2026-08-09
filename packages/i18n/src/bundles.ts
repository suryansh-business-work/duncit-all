import { flattenCatalogue, type NestedCatalogue } from './catalogue';
import { GRIEVANCE_BUNDLE } from './bundles/grievance';
import { MEDIA_BUNDLE } from './bundles/media';
import { MWEB_BUNDLE } from './bundles/mweb';
import { SHELL_BUNDLE } from './bundles/shell';
import { WEBSITE_BUNDLE } from './bundles/website';

/**
 * The SHIPPED FALLBACK CATALOGUE — every user-facing key the client surfaces
 * know about, in the same nested shape as the server's Localization entries
 * (CLAUDE.md rule 38).
 *
 * It lives in this package rather than in each surface for two reasons:
 *  - mWeb and native must be identical (rule 27), and two hand-kept copies of
 *    the same `mweb.*` copy is exactly how they drift apart;
 *  - the admin panel seeds Localization > Translations from this registry, so
 *    a key added here is offered for translation without anyone re-typing it.
 *
 * The copy itself is split one file per namespace under `./bundles/`, and this
 * module only assembles them. Localization work runs in parallel across many
 * surfaces, and a single file would make every contributor edit the same lines;
 * a namespace per file means a new `mweb.*` key and a new `shell.*` key never
 * touch each other. Adding a namespace means adding a file AND a line in
 * SURFACE_BUNDLES below — the registry is what the admin seeder reads.
 *
 * Each surface still SHIPS its bundle — it re-exports the slice it renders, so
 * the copy is compiled into that build and available offline.
 */
export { GRIEVANCE_BUNDLE, MEDIA_BUNDLE, MWEB_BUNDLE, SHELL_BUNDLE, WEBSITE_BUNDLE };

/** Every client bundle, by the surface that ships it. */
export const SURFACE_BUNDLES: Record<string, NestedCatalogue> = {
  grievance: GRIEVANCE_BUNDLE,
  media: MEDIA_BUNDLE,
  mweb: MWEB_BUNDLE,
  shell: SHELL_BUNDLE,
  website: WEBSITE_BUNDLE,
};

/**
 * Every shipped key as flat `key -> default text`, deduplicated across
 * surfaces. The admin panel imports this to seed missing Translations rows.
 */
export function allFallbackEntries(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const bundle of Object.values(SURFACE_BUNDLES)) {
    Object.assign(merged, flattenCatalogue(bundle));
  }
  return merged;
}
