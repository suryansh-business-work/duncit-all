import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Merge a component's default `sx` with a caller override. Later entries win,
 * so callers can tweak (or undo) any built-in style without losing the rest.
 */
export function mergeSx(defaults: SxProps<Theme>, override?: SxProps<Theme>): SxProps<Theme> {
  if (!override) return defaults;
  const base = Array.isArray(defaults) ? defaults : [defaults];
  const extra = Array.isArray(override) ? override : [override];
  return [...base, ...extra] as SxProps<Theme>;
}
