import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** Hidden when the account has no email or it is already verified. */
  email?: string | null;
  verified: boolean;
  onPress: () => void;
}

/** Home nudge to verify the account email — the RN twin of the info bar mWeb's
 * header shows. Tapping opens Profile Settings, where the verification section
 * mails and checks the OTP. */
export function VerifyEmailBanner({ email, verified, onPress }: Readonly<Props>) {
  const { primary } = useThemeColors();
  if (!email || verified) return null;

  return (
    <XStack
      testID="verify-email-banner"
      role="button"
      aria-label="Verify your email"
      onPress={onPress}
      marginHorizontal={16}
      alignItems="center"
      gap={10}
      paddingHorizontal={12}
      paddingVertical={10}
      borderRadius={10}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name="mark-email-unread" size={18} color={primary} />
      <Text flex={1} fontSize={13} fontWeight="700" color="$color">
        Please verify your email
      </Text>
      <MaterialIcons name="chevron-right" size={18} color={primary} />
    </XStack>
  );
}
