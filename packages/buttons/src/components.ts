import type { Components, CSSObject, Theme } from '@mui/material/styles';
import type { PressIntent } from '@duncit/buttons-native';
import { focusRingCss, pressCss, pressTransition, type PressColors, type TintSource } from './press-css';
import { mergeCss, mergeSlot, type SlotStyle } from './merge';

/** One pressable slot in the MUI theme, and how it is meant to feel. */
interface PressSlot {
  component: string;
  /** The `styleOverrides` key. Variant slots let a filled button and a text
   *  button in the same component take different treatments. */
  part: string;
  intent: PressIntent;
  tint: TintSource;
}

/**
 * Every pressable MUI renders, mapped to an intent.
 *
 * The variant slots are split on purpose: `background-color` REPLACES a fill
 * rather than layering over it, so a state layer belongs only on the parts that
 * are transparent to begin with. A filled control darkens its own fill instead
 * — which is also what the native side does, where there is no compositing
 * model for an overlay at all.
 */
const SLOTS: readonly PressSlot[] = [
  // Buttons — one treatment per variant.
  { component: 'MuiButton', part: 'text', intent: 'ghost', tint: 'ink' },
  { component: 'MuiButton', part: 'outlined', intent: 'control', tint: 'ink' },
  { component: 'MuiButton', part: 'contained', intent: 'solid', tint: 'none' },
  // Transparent by default, so a state layer is safe.
  { component: 'MuiIconButton', part: 'root', intent: 'ghost', tint: 'ink' },
  { component: 'MuiToggleButton', part: 'root', intent: 'control', tint: 'ink' },
  { component: 'MuiListItemButton', part: 'root', intent: 'row', tint: 'ink' },
  { component: 'MuiMenuItem', part: 'root', intent: 'row', tint: 'ink' },
  { component: 'MuiTab', part: 'root', intent: 'row', tint: 'ink' },
  { component: 'MuiBottomNavigationAction', part: 'root', intent: 'row', tint: 'ink' },
  { component: 'MuiCardActionArea', part: 'root', intent: 'surface', tint: 'ink' },
  // Carry their own fill.
  { component: 'MuiFab', part: 'root', intent: 'solid', tint: 'none' },
  { component: 'MuiChip', part: 'clickable', intent: 'solid', tint: 'none' },
];

/**
 * Controls that are transparent until selected. Their selected state has a
 * fill, so it darkens rather than taking the state layer that would replace it.
 */
const SELECTED_FILLS = new Set(['MuiToggleButton', 'MuiListItemButton']);

type SlotBag = { styleOverrides?: Record<string, SlotStyle | undefined> } & Record<string, unknown>;

function selectedFillCss(colors: Readonly<PressColors>): CSSObject {
  const solid = pressCss('solid', colors);
  return { '&.Mui-selected:active': solid['&:active'] as CSSObject };
}

function cssFor(slot: PressSlot, colors: Readonly<PressColors>): CSSObject {
  const base = mergeCss(pressCss(slot.intent, colors, { tint: slot.tint }), focusRingCss(colors));
  if (slot.part === 'root' && SELECTED_FILLS.has(slot.component)) {
    return mergeCss(base, selectedFillCss(colors));
  }
  return base;
}

/**
 * Layer the press system onto a theme's component overrides.
 *
 * Called by `@duncit/theme` (all 17 portals) and by mWeb's own `buildTheme`, so
 * every pressable MUI renders — including the ones inside MUI X pickers, the
 * DataGrid and Autocomplete, which no call site can reach — answers to the same
 * six intents. `DuncitButton` and `DuncitIconButton` carry their states
 * themselves and do not depend on this being wired.
 */
export function withPress(
  components: Components<Theme>,
  colors: Readonly<PressColors>
): Components<Theme> {
  const map = { ...components } as Record<string, SlotBag | undefined>;

  for (const slot of SLOTS) {
    const existing = map[slot.component] ?? {};
    const overrides = { ...(existing.styleOverrides ?? {}) };
    overrides[slot.part] = mergeSlot(overrides[slot.part], cssFor(slot, colors));
    map[slot.component] = { ...existing, styleOverrides: overrides };
  }

  // Every ButtonBase — checkboxes, radios and switches included — eases back
  // rather than snapping, so the ones that are not in the table above still
  // belong to the same motion.
  const buttonBase = map.MuiButtonBase ?? {};
  const baseOverrides = { ...(buttonBase.styleOverrides ?? {}) };
  baseOverrides.root = mergeSlot(baseOverrides.root, { transition: pressTransition });
  map.MuiButtonBase = { ...buttonBase, styleOverrides: baseOverrides };

  return map as Components<Theme>;
}
