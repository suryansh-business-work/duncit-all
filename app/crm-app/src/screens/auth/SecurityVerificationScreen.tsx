import { Linking } from 'react-native';
import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth.store';
import { AuthLayout } from './AuthLayout';
import { AlternativeRequest } from './security/AlternativeRequest';
import { ConsentList } from './security/ConsentList';
import { useSecurityVerification } from './security/useSecurityVerification';

/**
 * Security Verification & Location Tracking — the step the CRM portal asks of
 * every sign-in, here on the phone: the warning, the policies, the four
 * confirmations and the current location (or an administrator-approved
 * alternative). Nothing on this screen skips the check; the server enforces it.
 */
export function SecurityVerificationScreen() {
  const { t } = useTranslation();
  const signOut = useAuthStore((s) => s.signOut);
  const v = useSecurityVerification();
  const { challenge } = v;

  return (
    <AuthLayout
      title={t('shell.securityVerification.title')}
      subtitle={t('shell.securityVerification.subtitle', { vars: { portal: t('crmApp.login.title') } })}
    >
      <StateView loading={!challenge && !v.loadError} error={v.loadError} onRetry={v.load} />
      {challenge ? (
        <YStack gap="$4">
          {challenge.reverify ? <Text color="$warning">{t('shell.securityVerification.reverify')}</Text> : null}
          <YStack backgroundColor="$infoSoft" borderRadius="$3" padding="$3">
            <Text fontWeight="700">{t('shell.securityVerification.warning.label')}</Text>
            <Text>{t('shell.securityVerification.warning.body')}</Text>
          </YStack>
          <YStack gap="$2">
            <Text fontWeight="700" role="heading">
              {t('shell.securityVerification.policies.title')}
            </Text>
            {challenge.sections.map((section) => (
              <YStack key={section.key} gap="$1">
                <Text fontWeight="600">{section.title}</Text>
                {section.paragraphs.map((p) => (
                  <Text key={p} color="$muted">
                    {p}
                  </Text>
                ))}
              </YStack>
            ))}
          </YStack>
          <ConsentList consent={v.consent} onChange={v.setConsent} locationNotNeeded={v.approved !== null} />
          {v.approved ? null : (
            <YStack gap="$2">
              <Text fontWeight="700" role="heading">
                {t('shell.securityVerification.location.title')}
              </Text>
              <Text color="$muted">{t('shell.securityVerification.location.why')}</Text>
              <DuncitButton
                label={v.fix ? t('shell.securityVerification.location.refresh') : t('shell.securityVerification.location.request')}
                onPress={v.shareLocation}
                variant="outline"
                testID="security-location"
              />
              {v.fix ? <Text color="$success">{t('shell.securityVerification.location.granted')}</Text> : null}
              {v.locationError === 'PERMISSION_DENIED' ? (
                <YStack gap="$2">
                  <Text color="$danger">{t('crmApp.security.locationPermission')}</Text>
                  <DuncitButton label={t('crmApp.security.openSettings')} onPress={() => fireAndForget(Linking.openSettings(), logs.mobileApp, 'crm-app/SecurityVerificationScreen', 'openSettings')} variant="ghost" />
                </YStack>
              ) : null}
              {v.locationError === 'POSITION_UNAVAILABLE' ? (
                <Text color="$danger">{t('shell.securityVerification.location.unavailable')}</Text>
              ) : null}
            </YStack>
          )}
          {v.fix ? null : <AlternativeRequest exception={challenge.exception} onRequest={v.requestAlternative} />}
          {v.blocked.acknowledgements ? <Text color="$muted">{t('shell.securityVerification.blocked.acknowledgements')}</Text> : null}
          {!v.blocked.acknowledgements && v.blocked.location ? (
            <Text color="$muted">{t('shell.securityVerification.blocked.location')}</Text>
          ) : null}
          <DuncitButton
            label={v.submitting ? t('shell.securityVerification.proceeding') : t('shell.securityVerification.proceed')}
            onPress={v.submit}
            disabled={!v.canProceed}
            loading={v.submitting}
            fullWidth
            testID="security-proceed"
          />
          {v.submitError ? (
            <Text color="$danger" role="alert">
              {v.submitError}
            </Text>
          ) : null}
          <Text color="$muted">{t('shell.securityVerification.signOutHint')}</Text>
          <DuncitButton label={t('shell.securityVerification.signOut')} onPress={() => fireAndForget(signOut(), logs.mobileApp, 'crm-app/SecurityVerificationScreen', 'signOut')} variant="ghost" testID="security-sign-out" />
        </YStack>
      ) : null}
    </AuthLayout>
  );
}
