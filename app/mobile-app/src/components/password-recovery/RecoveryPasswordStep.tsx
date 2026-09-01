import { formResolver } from '../../utils/form-resolver';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import type { PasswordRecoveryLabels } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  makeRecoveryPasswordSchema,
  type RecoveryPasswordValues,
} from '@/forms/password-recovery/password-recovery.types';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  labels: PasswordRecoveryLabels;
  busy: boolean;
  onSave: (newPassword: string) => void;
}

const defaults: RecoveryPasswordValues = { new_password: '', confirm_password: '' };

/** Step three: the new password, typed twice. Twin of mWeb's <RecoveryPasswordStep/>. */
export function RecoveryPasswordStep({ labels, busy, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeRecoveryPasswordSchema(t), [t]);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<RecoveryPasswordValues, any, RecoveryPasswordValues>({
    defaultValues: defaults,
    resolver: formResolver<RecoveryPasswordValues>(schema),
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSave(values.new_password));

  return (
    <YStack gap={16}>
      <Text fontSize={13} color="$muted">
        {labels.passwordSubtitle}
      </Text>
      <FormTextField
        control={control}
        name="new_password"
        label={t('mweb.resetPassword.newPasswordLabel')}
        placeholder={t('mweb.resetPassword.newPasswordPlaceholder')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        required
        hint={t('mweb.auth.passwordHint')}
      />
      <FormTextField
        control={control}
        name="confirm_password"
        label={t('mweb.resetPassword.confirmPasswordLabel')}
        placeholder={t('mweb.resetPassword.confirmPasswordPlaceholder')}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        required
      />
      <PrimaryButton
        testID="recovery-save-password"
        label={busy ? labels.saving : labels.savePassword}
        loading={busy}
        disabled={busy || !isValid}
        onPress={submit}
      />
    </YStack>
  );
}
