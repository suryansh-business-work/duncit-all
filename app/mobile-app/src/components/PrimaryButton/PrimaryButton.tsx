import { Spinner, Text, XStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

/** Primary call-to-action button with disabled and loading states. Presses
 * scale down and spring back via the shared PressScale wrapper. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  testID,
}: Readonly<PrimaryButtonProps>) {
  const isDisabled = disabled || loading;

  return (
    <PressScale
      testID={testID}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      style={{ width: '100%' }}
    >
      <XStack
        aria-busy={loading}
        alignItems="center"
        justifyContent="center"
        width="100%"
        height={52}
        borderRadius={999}
        paddingHorizontal={20}
        backgroundColor="$primary"
        opacity={isDisabled ? 0.5 : 1}
        shadowColor="$primary"
        shadowOpacity={isDisabled ? 0 : 0.35}
        shadowRadius={14}
        shadowOffset={{ width: 0, height: 8 }}
      >
        {loading ? (
          <Spinner color="$onPrimary" testID={`${testID ?? 'primary-button'}-spinner`} />
        ) : (
          <Text color="$onPrimary" fontSize={16} fontWeight="600">
            {label}
          </Text>
        )}
      </XStack>
    </PressScale>
  );
}
