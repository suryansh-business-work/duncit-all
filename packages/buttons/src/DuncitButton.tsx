import Button, { type ButtonProps } from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import { pressFor, restStatesCss } from './state-css';

/**
 * Every button in mWeb and the portals.
 *
 * It takes MUI's `ButtonProps` unchanged — same `variant`, same `color`, same
 * `size`, same `loading`, same polymorphic `component` — because it replaced
 * ~1290 existing call sites, and a second vocabulary would have made that a
 * rewrite instead of a swap. Sizing, radius and palette still come from the
 * surface's own theme, so a portal button and an mWeb button keep looking like
 * themselves.
 *
 * What it adds is the part MUI leaves to the app: a real pressed state, a focus
 * ring that survives a coloured fill, and a disabled treatment that still looks
 * like the same button rather than a grey one. The press numbers come from
 * `@duncit/buttons-native`, which is what the app's Tamagui buttons read — so a
 * tap feels the same on both surfaces (rule 27).
 */
export type DuncitButtonProps = ButtonProps;

const Styled = styled(Button, { name: 'DuncitButton' })(({ theme }) => ({
  ...restStatesCss(theme),
  variants: [
    // A filled button darkens its own fill. Dimming one over a light page makes
    // it lighter, which reads as the button going away rather than going down.
    { props: { variant: 'contained' as const }, style: pressFor(theme, 'solid') },
    // Transparent to begin with, so a translucent state layer composites over
    // the page instead of replacing a fill.
    { props: { variant: 'outlined' as const }, style: pressFor(theme, 'control', { tint: 'ink' }) },
    { props: { variant: 'text' as const }, style: pressFor(theme, 'ghost', { tint: 'ink' }) },
  ],
}));

/**
 * `styled()` returns a plain component and drops MUI's `OverridableComponent`
 * typing, which is what makes `<Button component={RouterLink} to="…">` legal.
 * 72 call sites rely on it, so the styled result is handed back under the type
 * it actually satisfies rather than making those sites cast instead.
 */
export const DuncitButton = Styled as typeof Button;
