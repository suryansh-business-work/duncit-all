import { Linking } from 'react-native';
import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { config } from '@/constants/config';
import { useTranslation } from '@/hooks/useTranslation';

/** The portal's own words for each missing Twilio field (literal keys for the localization gate). */
const FIELD_KEYS: Record<string, string> = {
  account_sid: 'crm.call.fieldAccountSid',
  auth_token: 'crm.call.fieldAuthToken',
  phone_number: 'crm.call.fieldPhoneNumber',
};

/**
 * "Twilio is not configured", what is missing and — for someone allowed to
 * change it — a link to the Twilio section of the Tech portal; everyone else
 * is told to ask an administrator. The portal's notice, word for word.
 */
export function TwilioSetupNotice({
  missing,
  canConfigure,
}: Readonly<{ missing: readonly string[]; canConfigure: boolean }>) {
  const { t } = useTranslation();
  const fields = missing.map((field) => (FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : field));
  return (
    <YStack
      gap="$1"
      padding="$3"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$warning"
      backgroundColor="$warningSoft"
      role="alert"
      testID="twilio-setup-notice"
    >
      <Text fontWeight="700">{t('crm.call.notConfiguredTitle')}</Text>
      <Text>{t('crm.call.notConfiguredBody')}</Text>
      {fields.length > 0 ? (
        <Text>{t('crm.call.missingFields', { vars: { fields: fields.join(', ') } })}</Text>
      ) : null}
      {canConfigure ? (
        <Text
          role="link"
          color="$accentText"
          fontWeight="700"
          onPress={() =>
            fireAndForget(
              Linking.openURL(`${config.techUrl}/?section=TWILIO`),
              logs.mobileApp,
              'crm-app/TwilioSetupNotice',
              'openTech',
            )
          }
          testID="twilio-configure"
        >
          {t('crm.call.configureTwilio')}
        </Text>
      ) : (
        <Text>{t('crm.call.notConfiguredAskAdmin')}</Text>
      )}
    </YStack>
  );
}
