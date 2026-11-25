import { Linking } from 'react-native';
import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { useSecurityVerification } from './useSecurityVerification';

type Verification = ReturnType<typeof useSecurityVerification>;

interface Props {
  fix: Verification['fix'];
  locationError: Verification['locationError'];
  onShare: Verification['shareLocation'];
}

/**
 * The current-location step: why it is asked, share (or refresh) it, and what
 * to do when the phone refuses — open Settings for a denied permission, or say
 * the position is unavailable.
 */
export function LocationStep({ fix, locationError, onShare }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <Text fontWeight="700" role="heading">
        {t('shell.securityVerification.location.title')}
      </Text>
      <Text color="$muted">{t('shell.securityVerification.location.why')}</Text>
      <DuncitButton
        label={
          fix
            ? t('shell.securityVerification.location.refresh')
            : t('shell.securityVerification.location.request')
        }
        onPress={onShare}
        variant="outline"
        testID="security-location"
      />
      {fix ? (
        <Text color="$success">{t('shell.securityVerification.location.granted')}</Text>
      ) : null}
      {locationError === 'PERMISSION_DENIED' ? (
        <YStack gap="$2">
          <Text color="$danger">{t('crmApp.security.locationPermission')}</Text>
          <DuncitButton
            label={t('crmApp.security.openSettings')}
            onPress={() =>
              fireAndForget(
                Linking.openSettings(),
                logs.mobileApp,
                'crm-app/LocationStep',
                'openSettings',
              )
            }
            variant="ghost"
          />
        </YStack>
      ) : null}
      {locationError === 'POSITION_UNAVAILABLE' ? (
        <Text color="$danger">{t('shell.securityVerification.location.unavailable')}</Text>
      ) : null}
    </YStack>
  );
}
