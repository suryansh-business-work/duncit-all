import { Linking } from 'react-native';
import { Text } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

/**
 * Terms & Privacy footer, mirroring mWeb's <LegalLinks/>. URLs come from the
 * shared auth tokens so both apps point at the same legal pages.
 */
export function LegalLinks({ prefix = 'By continuing,' }: Readonly<{ prefix?: string }>) {
  return (
    <Text textAlign="center" fontSize={12} lineHeight={20} color="$muted">
      {prefix} you agree to our{' '}
      <Text
        testID="legal-terms"
        color={auth.accent}
        fontWeight="700"
        onPress={() => Linking.openURL(auth.legal.termsUrl)}
      >
        Terms &amp; Conditions
      </Text>{' '}
      and{' '}
      <Text
        testID="legal-privacy"
        color={auth.accent}
        fontWeight="700"
        onPress={() => Linking.openURL(auth.legal.privacyUrl)}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}
