import { DuncitButton } from '@/components/DuncitButton';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  /** Screen-reader name when `label` alone is ambiguous; must start with `label`. */
  accessibilityLabel?: string;
  /** What a press does, when the result is not obvious. */
  accessibilityHint?: string;
}

/**
 * The app's full-width call to action.
 *
 * Now a `DuncitButton` at `lg`: it used to carry its own height, radius,
 * pressed opacity and disabled dim, which is exactly the drift the press system
 * exists to remove. The API is unchanged — 24 call sites keep working — and the
 * numbers now come from `@duncit/buttons-native`, the same ones mWeb's MUI
 * theme reads.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: Readonly<PrimaryButtonProps>) {
  return (
    <DuncitButton
      testID={testID ?? 'primary-button'}
      label={label}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      size="lg"
      fullWidth
      elevated
      disabled={disabled}
      loading={loading}
    />
  );
}
