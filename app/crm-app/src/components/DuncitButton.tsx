import type { ReactNode } from 'react';
import { Spinner, Text, XStack } from 'tamagui';
import {
  buttonSpec,
  PRESS_STYLE,
  TOUCH_TARGET,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from '@duncit/buttons-native';

export interface DuncitButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  testID?: string;
  /** Must START with `label` (WCAG 2.5.3 Label in Name). Defaults to `label`. */
  accessibilityLabel?: string;
}

const SHADOW_OFFSET = { width: 0, height: 6 };

/**
 * Every button in the app, spending the shared press numbers from
 * @duncit/buttons-native — the same recipe the member app's and the portals'
 * DuncitButton use, so a press feels the same on every Duncit surface.
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
  icon,
  testID,
  accessibilityLabel,
}: Readonly<DuncitButtonProps>) {
  const spec = buttonSpec({ variant, tone, size, disabled, loading, fullWidth });
  const hitSlop = Math.max(0, (TOUCH_TARGET - spec.height) / 2);
  const pressed = spec.interactive ? { ...PRESS_STYLE[spec.intent], backgroundColor: spec.pressBackgroundColor } : undefined;
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={accessibilityLabel ?? label}
      aria-busy={loading}
      aria-disabled={!spec.interactive}
      tabIndex={0}
      hitSlop={hitSlop}
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
      shadowColor={variant === 'solid' ? spec.backgroundColor : undefined}
      shadowOpacity={variant === 'solid' && spec.interactive ? 0.25 : 0}
      shadowRadius={variant === 'solid' ? 10 : 0}
      shadowOffset={SHADOW_OFFSET}
      pressStyle={pressed}
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
        </>
      )}
    </XStack>
  );
}
