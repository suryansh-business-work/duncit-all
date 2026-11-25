import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth.store';
import { AuthLayout } from './AuthLayout';
import { AlternativeRequest } from './security/AlternativeRequest';
import { ConsentList } from './security/ConsentList';
import { LocationStep } from './security/LocationStep';
import { PolicySections } from './security/PolicySections';
import { useSecurityVerification } from './security/useSecurityVerification';

/** Why Proceed is still disabled: the confirmations first, then the location. */
function blockedKey(blocked: { acknowledgements: boolean; location: boolean }): string | null {
  if (blocked.acknowledgements) return 'shell.securityVerification.blocked.acknowledgements';
  if (blocked.location) return 'shell.securityVerification.blocked.location';
  return null;
}

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
  const blocked = blockedKey(v.blocked);

  return (
    <AuthLayout
      title={t('shell.securityVerification.title')}
      subtitle={t('shell.securityVerification.subtitle', {
        vars: { portal: t('crmApp.login.title') },
      })}
    >
      <StateView loading={!challenge && !v.loadError} error={v.loadError} onRetry={v.load} />
      {challenge ? (
        <YStack gap="$4">
          <PolicySections challenge={challenge} />
          <ConsentList
            consent={v.consent}
            onChange={v.setConsent}
            locationNotNeeded={v.approved !== null}
          />
          {v.approved ? null : (
            <LocationStep fix={v.fix} locationError={v.locationError} onShare={v.shareLocation} />
          )}
          {v.fix ? null : (
            <AlternativeRequest exception={challenge.exception} onRequest={v.requestAlternative} />
          )}
          {blocked ? <Text color="$muted">{t(blocked)}</Text> : null}
          <DuncitButton
            label={
              v.submitting
                ? t('shell.securityVerification.proceeding')
                : t('shell.securityVerification.proceed')
            }
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
          <DuncitButton
            label={t('shell.securityVerification.signOut')}
            onPress={() =>
              fireAndForget(
                signOut(),
                logs.mobileApp,
                'crm-app/SecurityVerificationScreen',
                'signOut',
              )
            }
            variant="ghost"
            testID="security-sign-out"
          />
        </YStack>
      ) : null}
    </AuthLayout>
  );
}
