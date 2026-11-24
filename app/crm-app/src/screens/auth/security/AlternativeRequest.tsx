import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { makeSecurityExceptionSchema, securityExceptionDefaults, type SecurityExceptionValues } from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { errorMessage } from '@/utils/errors';
import type { Challenge } from './useSecurityVerification';

interface Props {
  exception: Challenge['exception'];
  onRequest: (reason: string) => Promise<void>;
}

/** No location possible: ask an administrator for another way to verify — the portal's form and rules. */
export function AlternativeRequest({ exception, onRequest }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const resolver = useMemo(() => formResolver<SecurityExceptionValues>(makeSecurityExceptionSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<SecurityExceptionValues, any, SecurityExceptionValues>({
    defaultValues: securityExceptionDefaults,
    resolver,
    mode: 'onTouched',
  });

  if (exception?.status === 'PENDING') return <Text color="$muted">{t('shell.securityVerification.alternative.pending')}</Text>;
  if (exception?.status === 'APPROVED') {
    return <Text color="$success">{t('shell.securityVerification.alternative.approved', { vars: { until: exception.expires_at ?? '' } })}</Text>;
  }

  const submit = async ({ reason }: SecurityExceptionValues) => {
    setError(null);
    try {
      await onRequest(reason.trim());
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <YStack gap="$2">
      <Text fontWeight="700" role="heading">
        {t('shell.securityVerification.alternative.title')}
      </Text>
      <Text color="$muted">{t('shell.securityVerification.alternative.body')}</Text>
      {exception?.status === 'REJECTED' ? (
        <Text color="$danger">
          {exception.decision_note
            ? t('shell.securityVerification.alternative.rejectedWithNote', { vars: { note: exception.decision_note } })
            : t('shell.securityVerification.alternative.rejected')}
        </Text>
      ) : null}
      <TextField
        control={control}
        name="reason"
        label={t('shell.securityVerification.alternative.reasonLabel')}
        hint={t('shell.securityVerification.alternative.reasonHint')}
        placeholder={t('crmApp.security.reasonPlaceholder')}
        multiline
        testID="security-reason"
      />
      <DuncitButton
        label={t('shell.securityVerification.alternative.submit')}
        onPress={handleSubmit(submit)}
        loading={formState.isSubmitting}
        variant="outline"
        testID="security-alternative"
      />
      {error ? <Text color="$danger">{error}</Text> : null}
    </YStack>
  );
}
