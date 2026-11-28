import { useState } from 'react';
import { Text } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StateView } from '@/components/StateView';
import { useSecurityVerificationSetting } from '@/features/app-settings/useSecurityVerificationSetting';
import { useTranslation } from '@/hooks/useTranslation';
import { haptics } from '@/services/haptics';
import { errorMessage } from '@/utils/errors';
import { ToggleRow } from './ToggleRow';

const SCOPE = 'crm-app/AppSecurityCard';

/**
 * Sign-in security, as the CRM portal's CRM Mobile App › Settings shows it:
 * whether a sign-in to this app goes through Security Verification. Turning it
 * off asks first; it applies to the next sign-in.
 */
export function AppSecurityCard() {
  const { t } = useTranslation();
  const setting = useSecurityVerificationSetting(t);
  const [confirming, setConfirming] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);

  const apply = async (next: boolean) => {
    setResult(null);
    setDialogError(null);
    try {
      await setting.save(next);
      setConfirming(false);
      haptics.success();
      const message = next
        ? t('crm.downloadApp.settings.security.savedOn')
        : t('crm.downloadApp.settings.security.savedOff');
      setResult({ message, ok: true });
    } catch (err) {
      haptics.error();
      const message = errorMessage(err, t('crmApp.common.saveFailed'));
      // Turning off fails inside its dialog, so it can be tried again there.
      if (next) setResult({ message, ok: false });
      else setDialogError(message);
    }
  };

  const onChange = (next: boolean) => {
    if (next) fireAndForget(apply(true), logs.mobileApp, SCOPE, 'on');
    else setConfirming(true);
  };

  return (
    <Card title={t('crm.downloadApp.settings.security.title')} testID="app-security-card">
      {setting.value === null ? (
        <StateView
          inline
          loading={setting.loading}
          error={setting.error}
          onRetry={setting.refetch}
        />
      ) : (
        <ToggleRow
          id="app-security-verification"
          label={t('crm.downloadApp.settings.security.label')}
          hint={t('crm.downloadApp.settings.security.hint')}
          value={setting.value}
          onChange={onChange}
        />
      )}
      {result ? (
        <Text
          role="status"
          aria-live="polite"
          color={result.ok ? '$success' : '$danger'}
          fontWeight="600"
        >
          {result.message}
        </Text>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t('crm.downloadApp.settings.security.confirmTitle')}
        message={t('crm.downloadApp.settings.security.confirmMessage')}
        confirmLabel={t('crm.downloadApp.settings.security.confirmOff')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={setting.busy}
        error={dialogError}
        onConfirm={() => fireAndForget(apply(false), logs.mobileApp, SCOPE, 'off')}
        onCancel={() => {
          setConfirming(false);
          setDialogError(null);
        }}
        testID="app-security-confirm"
      />
    </Card>
  );
}
