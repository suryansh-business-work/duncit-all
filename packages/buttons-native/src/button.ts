import { DISABLED_OPACITY, TOUCH_TARGET, type PressIntent } from './intents';

/** How a button is painted. Orthogonal to `ButtonTone`, which says in what colour. */
export type ButtonVariant =
  /** Filled. One per screen — the thing the screen is for. */
  | 'solid'
  /** Hairline border, no fill. The second action beside a solid one. */
  | 'outline'
  /** Tonal — the tone at low alpha. Reads as a button without competing with one. */
  | 'soft'
  /** No fill and no border. Dismiss, cancel, "not now". */
  | 'ghost';

/** What the button means. */
export type ButtonTone = 'primary' | 'neutral' | 'danger' | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonSizeSpec {
  height: number;
  paddingHorizontal: number;
  fontSize: number;
  iconSize: number;
  gap: number;
  borderRadius: number;
}

/**
 * Sizes, shared by both platforms so a "medium" button is the same button in
 * the app and in mWeb. `md` is the floor at exactly one touch target: MUI's
 * default medium lands near 38px, which is under it.
 */
export const BUTTON_SIZES: Readonly<Record<ButtonSize, Readonly<ButtonSizeSpec>>> = Object.freeze({
  sm: Object.freeze({
    height: 36,
    paddingHorizontal: 14,
    fontSize: 13,
    iconSize: 16,
    gap: 6,
    borderRadius: 999,
  }),
  md: Object.freeze({
    height: TOUCH_TARGET,
    paddingHorizontal: 18,
    fontSize: 15,
    iconSize: 18,
    gap: 8,
    borderRadius: 999,
  }),
  lg: Object.freeze({
    height: 52,
    paddingHorizontal: 22,
    fontSize: 16,
    iconSize: 20,
    gap: 10,
    borderRadius: 999,
  }),
});

/**
 * The Tamagui theme keys each tone reads. Names, not colours — the app's
 * `tamagui.config.ts` already resolves them from `@duncit/auth-tokens`, which
 * is the same file mWeb's MUI palette is built from. A colour written here
 * would be a third copy of the brand red.
 */
interface ToneTokens {
  fill: string;
  fillPress: string;
  onFill: string;
  accent: string;
  soft: string;
}

const TONES: Readonly<Record<ButtonTone, Readonly<ToneTokens>>> = Object.freeze({
  primary: Object.freeze({
    fill: '$primary',
    fillPress: '$primaryPress',
    onFill: '$onPrimary',
    accent: '$primary',
    soft: '$primarySoft',
  }),
  neutral: Object.freeze({
    fill: '$surface',
    fillPress: '$backgroundPress',
    onFill: '$color',
    accent: '$color',
    soft: '$backgroundPress',
  }),
  danger: Object.freeze({
    fill: '$danger',
    fillPress: '$dangerPress',
    onFill: '$onPrimary',
    accent: '$danger',
    soft: '$dangerSoft',
  }),
  success: Object.freeze({
    fill: '$success',
    fillPress: '$successPress',
    onFill: '$onPrimary',
    accent: '$success',
    soft: '$successSoft',
  }),
});

/** The press intent each variant answers to. */
const VARIANT_INTENT: Readonly<Record<ButtonVariant, PressIntent>> = Object.freeze({
  solid: 'solid',
  outline: 'control',
  soft: 'control',
  ghost: 'ghost',
});

export interface ButtonSpecInput {
  variant: ButtonVariant;
  tone: ButtonTone;
  size: ButtonSize;
  /** Disabled and loading look the same from the outside: nothing to press. */
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export interface ButtonSpec extends ButtonSizeSpec {
  backgroundColor: string;
  pressBackgroundColor: string;
  borderWidth: number;
  borderColor: string;
  /** Label, icon and spinner colour. */
  color: string;
  opacity: number;
  width?: string;
  /** Nothing to press while it is loading or disabled. */
  interactive: boolean;
  intent: PressIntent;
}

const TRANSPARENT = 'transparent';

function surfaceFor(variant: ButtonVariant, tone: Readonly<ToneTokens>) {
  if (variant === 'solid') {
    return { background: tone.fill, press: tone.fillPress, label: tone.onFill, border: 0 };
  }
  if (variant === 'soft') {
    return { background: tone.soft, press: tone.soft, label: tone.accent, border: 0 };
  }
  if (variant === 'outline') {
    return { background: TRANSPARENT, press: TRANSPARENT, label: tone.accent, border: 1 };
  }
  return { background: TRANSPARENT, press: TRANSPARENT, label: tone.accent, border: 0 };
}

/**
 * Everything a native button needs to paint itself in every state.
 *
 * Derived rather than written per component because the app grew ~20 local
 * button components, each re-deciding its own height, radius, pressed opacity
 * and disabled dim. Its MUI twin, `DuncitButton` in `@duncit/buttons`, reads
 * the same numbers.
 */
export function buttonSpec(input: Readonly<ButtonSpecInput>): ButtonSpec {
  const { variant, tone, size, disabled = false, loading = false, fullWidth = false } = input;
  const dimensions = BUTTON_SIZES[size];
  const tokens = TONES[tone];
  const surface = surfaceFor(variant, tokens);
  const inert = disabled || loading;

  return {
    ...dimensions,
    backgroundColor: surface.background,
    pressBackgroundColor: surface.press,
    borderWidth: surface.border,
    borderColor: surface.border > 0 ? tokens.accent : TRANSPARENT,
    color: surface.label,
    // A loading button keeps its colour: it is still the thing you just
    // pressed. Only a disabled one recedes.
    opacity: disabled ? DISABLED_OPACITY : 1,
    width: fullWidth ? '100%' : undefined,
    interactive: !inert,
    intent: VARIANT_INTENT[variant],
  };
}
