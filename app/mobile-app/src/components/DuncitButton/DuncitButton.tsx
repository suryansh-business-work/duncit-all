import type { ReactNode } from 'react';
import { Spinner, Text, XStack } from 'tamagui';
import {
  buttonSpec,
  PRESS_STYLE,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from '@duncit/buttons-native';

const SHADOW_OFFSET = { width: 0, height: 8 };

export interface DuncitButtonProps {
  label: string;
  onPress: () => void;
  /** How it is painted. `solid` for the one thing the screen is for. */
  variant?: ButtonVariant;
  /** What it means. */
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  /** Still the button you just pressed — it keeps its colour and stops taking input. */
  loading?: boolean;
  fullWidth?: boolean;
  /** A lifted CTA — the glow the app has always had under its primary action. */
  elevated?: boolean;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  testID?: string;
}

/**
 * Every button in the app.
 *
 * The MUI twin is `DuncitButton` in `@duncit/buttons`, and both spend the same
 * numbers: sizes, tones and the press recipe all come out of `buttonSpec` in
 * `@duncit/buttons-native`. Rule 27 is about mWeb and native looking like one
 * product — which they cannot if each app re-decides what a pressed button is,
 * which is how the app ended up with six different pressed opacities and ~20
 * near-identical local button components.
 *
 * Rule 40 keeps the Tamagui view here rather than in the package: the app
 * compiles a linked package from its own source and resolves nothing from
 * `packages/<name>/` in CI, so a package it imports may not import `tamagui`.
 */
export function DuncitButton({
  label,
  onPress,
  variant = 'solid',
  tone = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  elevated = false,
  icon,
  iconAfter,
  testID,
}: Readonly<DuncitButtonProps>) {
  const spec = buttonSpec({ variant, tone, size, disabled, loading, fullWidth });
  const pressed = spec.interactive
    ? { ...PRESS_STYLE[spec.intent], backgroundColor: spec.pressBackgroundColor }
    : undefined;

  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-busy={loading}
      aria-disabled={!spec.interactive}
      disabled={!spec.interactive}
      onPress={spec.interactive ? onPress : undefined}
      alignItems="center"
      justifyContent="center"
      gap={spec.gap}
      width={spec.width}
      height={spec.height}
      paddingHorizontal={spec.paddingHorizontal}
      borderRadius={spec.borderRadius}
      borderWidth={spec.borderWidth}
      borderColor={spec.borderColor}
      backgroundColor={spec.backgroundColor}
      opacity={spec.opacity}
      shadowColor={elevated ? spec.backgroundColor : undefined}
      shadowOpacity={elevated && spec.interactive ? 0.35 : 0}
      shadowRadius={elevated ? 14 : 0}
      shadowOffset={SHADOW_OFFSET}
      pressStyle={pressed}
      hoverStyle={pressed}
      focusStyle={{ outlineColor: spec.borderColor, outlineWidth: 2, outlineStyle: 'solid' }}
    >
      {loading ? (
        <Spinner color={spec.color} testID={testID ? `${testID}-spinner` : undefined} />
      ) : (
        <>
          {icon}
          <Text color={spec.color} fontSize={spec.fontSize} fontWeight="600">
            {label}
          </Text>
          {iconAfter}
        </>
      )}
    </XStack>
  );
}
