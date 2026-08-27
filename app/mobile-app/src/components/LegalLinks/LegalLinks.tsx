import { Linking } from 'react-native';
import { Text } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Terms & Privacy footer, mirroring mWeb's <LegalLinks/>. URLs come from the
 * shared auth tokens so both apps point at the same legal pages.
 */
export function LegalLinks({ prefix }: Readonly<{ prefix?: string }>) {
  const { t } = useTranslation();
  // The lead-in arrives already translated because it names the action of the
  // screen it sits on ("By signing in," / "By signing up,").
  const lead = prefix ?? t('mweb.auth.legalContinue');

  return (
    <Text textAlign="center" fontSize={12} lineHeight={20} color="$muted">
      {lead} {t('mweb.auth.legalAgree')}{' '}
      <Text
        pressStyle={PRESS_STYLE.inline}
        testID="legal-terms"
        color={auth.accent}
        fontWeight="700"
        onPress={() => Linking.openURL(auth.legal.termsUrl)}
      >
        {t('mweb.auth.terms')}
      </Text>{' '}
      {t('mweb.auth.legalAnd')}{' '}
      <Text
        pressStyle={PRESS_STYLE.inline}
        testID="legal-privacy"
        color={auth.accent}
        fontWeight="700"
        onPress={() => Linking.openURL(auth.legal.privacyUrl)}
      >
        {t('mweb.auth.privacy')}
      </Text>
      .
    </Text>
  );
}
