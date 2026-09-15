import { Linking } from 'react-native';
import { Text } from 'tamagui';

import { useLegalUrls } from '@/hooks/useLegalUrls';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Terms & Privacy footer, mirroring mWeb's <LegalLinks/> — the links are green
 * 600 like every other auth link there. URLs come from the admin Branding
 * setting; the shared auth tokens carry the same defaults so the links work
 * before that query answers.
 */
export function LegalLinks({ prefix }: Readonly<{ prefix?: string }>) {
  const { t } = useTranslation();
  const { termsUrl, privacyUrl } = useLegalUrls();
  // The lead-in arrives already translated because it names the action of the
  // screen it sits on ("By signing in," / "By signing up,").
  const lead = prefix ?? t('mweb.auth.legalContinue');

  return (
    <Text textAlign="center" fontSize={12} lineHeight={20} color="$muted">
      {lead} {t('mweb.auth.legalAgree')}{' '}
      <Text
        pressStyle={PRESS_STYLE.inline}
        testID="legal-terms"
        // Opens a web page — a link, so both screen readers offer it as one
        // (Android and iOS expose a nested link inside the sentence).
        role="link"
        color="$primary"
        fontWeight="600"
        onPress={() => Linking.openURL(termsUrl)}
      >
        {t('mweb.auth.terms')}
      </Text>{' '}
      {t('mweb.auth.legalAnd')}{' '}
      <Text
        pressStyle={PRESS_STYLE.inline}
        testID="legal-privacy"
        role="link"
        color="$primary"
        fontWeight="600"
        onPress={() => Linking.openURL(privacyUrl)}
      >
        {t('mweb.auth.privacy')}
      </Text>
      .
    </Text>
  );
}
