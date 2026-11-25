import { Linking } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { CrmAppBrandingDocument } from '@/graphql/auth';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';

const NO_VARS = {};

const open = (url: string) =>
  fireAndForget(Linking.openURL(url), logs.mobileApp, 'crm-app/AuthLegalLinks', 'openURL');

function LegalLink({
  label,
  url,
  testID,
}: Readonly<{ label: string; url: string; testID: string }>) {
  return (
    <Text
      role="link"
      color="$muted"
      fontSize="$2"
      fontWeight="600"
      onPress={() => open(url)}
      testID={testID}
    >
      {label}
    </Text>
  );
}

/**
 * Under the portal login card: Privacy Policy, Terms of Use and who to write to
 * when signing in fails — from Admin Branding, so they are the links the
 * portal shows. Nothing shows until the server has answered.
 */
export function AuthLegalLinks() {
  const { t } = useTranslation();
  const { data } = useGqlQuery(CrmAppBrandingDocument, NO_VARS);
  const branding = data?.branding;
  if (!branding) return null;
  return (
    <YStack gap="$2" marginTop="$3">
      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        <LegalLink
          label={t('session.login.privacyPolicy')}
          url={branding.privacy_url}
          testID="login-privacy-link"
        />
        <Text color="$muted" aria-hidden>
          ·
        </Text>
        <LegalLink
          label={t('session.login.termsOfUse')}
          url={branding.terms_url}
          testID="login-terms-link"
        />
      </XStack>
      {branding.support_email ? (
        <Text color="$muted" fontSize="$2">
          {t('session.login.supportPrefix')}{' '}
          <Text
            role="link"
            color="$primary"
            fontWeight="600"
            onPress={() => open(`mailto:${branding.support_email}`)}
            testID="login-support-email"
          >
            {branding.support_email}
          </Text>{' '}
          {t('session.login.supportSuffix')}
        </Text>
      ) : null}
    </YStack>
  );
}
