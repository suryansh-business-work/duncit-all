import { ActivityIndicator, Pressable, Text } from 'react-native';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

/** Primary call-to-action button with disabled and loading states. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  testID,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`w-full items-center rounded-xl px-5 py-4 ${
        isDisabled ? 'bg-brand-dark/50' : 'bg-brand active:bg-brand-dark'
      }`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" testID={`${testID ?? 'primary-button'}-spinner`} />
      ) : (
        <Text className="text-base font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}
