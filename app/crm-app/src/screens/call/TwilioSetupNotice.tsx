import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';

/** The portal's own words for each missing Twilio field (literal keys for the localization gate). */
const FIELD_KEYS: Record<string, string> = {
  account_sid: 'crm.call.fieldAccountSid',
  auth_token: 'crm.call.fieldAuthToken',
  phone_number: 'crm.call.fieldPhoneNumber',
};

/**
 * "Twilio is not configured", what is missing and — for someone allowed to
 * change it — Configure Twilio, which opens the settings right here in the
 * app (Settings › Twilio); everyone else is told to ask an administrator.
 */
export function TwilioSetupNotice({
  missing,
  canConfigure,
}: Readonly<{ missing: readonly string[]; canConfigure: boolean }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
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
          onPress={() => navigation.navigate('TwilioSetup')}
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
