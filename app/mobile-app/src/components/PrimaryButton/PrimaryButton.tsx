import { Spinner, Text, XStack } from 'tamagui';

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
}: Readonly<PrimaryButtonProps>) {
  const isDisabled = disabled || loading;

  return (
    <XStack
      testID={testID}
      role="button"
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      onPress={() => {
        if (!isDisabled) onPress();
      }}
      alignItems="center"
      justifyContent="center"
      width="100%"
      height={52}
      borderRadius={12}
      paddingHorizontal={20}
      backgroundColor="$primary"
      opacity={isDisabled ? 0.5 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      {loading ? (
        <Spinner color="$onPrimary" testID={`${testID ?? 'primary-button'}-spinner`} />
      ) : (
        <Text color="$onPrimary" fontSize={16} fontWeight="600">
          {label}
        </Text>
      )}
    </XStack>
  );
}
