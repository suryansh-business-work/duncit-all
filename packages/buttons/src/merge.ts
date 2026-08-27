import type { CSSObject } from '@mui/material/styles';

/** A `styleOverrides` slot: MUI allows a plain object or a function of props. */
export type SlotStyle = CSSObject | ((props: never) => CSSObject);

const isSelector = (key: string): boolean => key.startsWith('&') || key.startsWith('@');

/**
 * Merge two style objects, one level deep through selector keys.
 *
 * A plain spread would drop the theme's existing `&:hover` the moment the press
 * layer adds its own `&:active` sibling — they are different keys, but the next
 * component to need both would silently lose one. Merging through `&`/`@` keys
 * is the whole depth CSS-in-JS overrides actually use here.
 */
export function mergeCss(base: CSSObject | undefined, extra: CSSObject): CSSObject {
  if (!base) {
    return extra;
  }
  const out: CSSObject = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const existing = out[key];
    const bothNested =
      isSelector(key) &&
      typeof existing === 'object' &&
      existing !== null &&
      typeof value === 'object' &&
      value !== null;
    out[key] = bothNested ? { ...existing, ...value } : value;
  }
  return out;
}

/** The same merge, tolerating the function form MUI allows for a slot. */
export function mergeSlot(base: SlotStyle | undefined, extra: CSSObject): SlotStyle {
  if (typeof base === 'function') {
    return (props: never) => mergeCss(base(props), extra);
  }
  return mergeCss(base, extra);
}
