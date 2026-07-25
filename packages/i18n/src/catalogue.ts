/**
 * Translation catalogues: the shape, and the parsing between the nested form
 * humans author and the flat dot-path form the runtime and the admin panel use.
 *
 * ONE structure serves both the server data and every surface's local fallback
 * bundle, which is what lets a screen render identically offline, before the
 * API responds, and after it arrives.
 */

/** Authored/stored form: arbitrarily nested, page-wise then key-wise. */
export interface NestedCatalogue {
  [key: string]: string | NestedCatalogue;
}

/** Runtime form: 'mweb.shop.emptyState' -> 'No products match your filters.' */
export type FlatCatalogue = Record<string, string>;

/** A locale the platform supports, e.g. en-IN / hi-IN / ar-AE. */
export interface Locale {
  /** BCP-47 tag; the stable id used everywhere including profile.locale. */
  code: string;
  /** Endonym shown in the language switcher, e.g. "हिन्दी". */
  label: string;
  /** English name for admin lists, e.g. "Hindi (India)". */
  english_label?: string | null;
  /** Right-to-left script — flips document direction / RN I18nManager. */
  is_rtl?: boolean | null;
  is_active?: boolean | null;
  /** Exactly one locale is the source language every other falls back to. */
  is_default?: boolean | null;
}

/**
 * Flatten a nested catalogue to dot-paths. Non-string leaves are dropped rather
 * than coerced, so a malformed entry can never render "[object Object]".
 */
export function flattenCatalogue(input: NestedCatalogue | null | undefined): FlatCatalogue {
  const out: FlatCatalogue = {};
  const walk = (node: NestedCatalogue, prefix: string) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        out[path] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Arrays are objects too, and recursing into one would invent numeric
        // keys like `nested.list.0` that no author ever wrote.
        walk(value, path);
      }
    }
  };
  if (input) walk(input, '');
  return out;
}

/** Expand dot-paths back to nested form — how the admin panel and the local
 * fallback files present a catalogue for editing/authoring. */
export function nestCatalogue(flat: FlatCatalogue | null | undefined): NestedCatalogue {
  const out: NestedCatalogue = {};
  for (const [path, value] of Object.entries(flat ?? {})) {
    const parts = path.split('.').filter(Boolean);
    if (parts.length === 0) continue;
    let node = out;
    for (const part of parts.slice(0, -1)) {
      const next = node[part];
      // A leaf already occupying this path would be silently shadowed; replace
      // it with a branch so the deeper key is not lost.
      if (!next || typeof next === 'string') node[part] = {};
      node = node[part] as NestedCatalogue;
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

/**
 * Merge a locale's entries over the local fallback bundle.
 *
 * The fallback is the floor: any key the server has not translated yet still
 * renders real text rather than a raw key. Server values win where present, and
 * blank server values are ignored so an empty admin field cannot blank the UI.
 */
export function mergeCatalogues(
  fallback: FlatCatalogue | null | undefined,
  server: FlatCatalogue | null | undefined,
): FlatCatalogue {
  const merged: FlatCatalogue = { ...(fallback ?? {}) };
  for (const [key, value] of Object.entries(server ?? {})) {
    if (typeof value === 'string' && value.trim() !== '') merged[key] = value;
  }
  return merged;
}

/**
 * Keys present in the reference catalogue but missing from `candidate`.
 * Powers both the admin's "untranslated" view and the build-time parity check
 * that stops a surface shipping a fallback bundle with holes in it.
 */
export function missingKeys(
  reference: FlatCatalogue | null | undefined,
  candidate: FlatCatalogue | null | undefined,
): string[] {
  const has = candidate ?? {};
  return Object.keys(reference ?? {})
    .filter((key) => typeof has[key] !== 'string' || has[key].trim() === '')
    .sort((a, b) => a.localeCompare(b));
}
