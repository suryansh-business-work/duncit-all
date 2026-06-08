import { Spinner, Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Full-screen blocking overlay shown while a payment is being processed/verified.
 * Captures all touches so the form underneath can't be edited once the user has
 * submitted (e.g. after returning from the Razorpay sheet). RN twin of mWeb's
 * <Backdrop> on the checkout page. */
export function ProcessingOverlay({ open }: { open: boolean }) {
  const { primary } = useThemeColors();
  if (!open) return null;

  return (
    <YStack
      testID="checkout-processing"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1000}
      alignItems="center"
      justifyContent="center"
      padding={24}
      backgroundColor="rgba(3,7,18,0.72)"
      // No-op press keeps touches from reaching the form beneath.
      onPress={() => {}}
    >
      <YStack
        width={300}
        maxWidth="100%"
        alignItems="center"
        gap={12}
        paddingVertical={28}
        paddingHorizontal={24}
        borderRadius={20}
        backgroundColor="rgba(17,24,39,0.94)"
        borderWidth={1}
        borderColor="rgba(255,255,255,0.16)"
      >
        <Spinner size="large" color={primary} />
        <Text fontSize={16} fontWeight="900" color="#ffffff" textAlign="center">
          Processing your payment…
        </Text>
        <Text fontSize={12.5} color="rgba(255,255,255,0.74)" textAlign="center">
          Please don't close this screen.
        </Text>
      </YStack>
    </YStack>
  );
}
