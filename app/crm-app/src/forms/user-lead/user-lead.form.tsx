import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { makeUserLeadSchema, userLeadDefaults, type UserLeadValues } from './user-lead.types';

interface Props {
  initial?: UserLeadValues;
  onSubmit: (values: UserLeadValues) => Promise<void>;
  submitLabel: string;
  /** The server's refusal (a duplicate number, a bad format), already worded. */
  error?: string | null;
}

/** Phone (with country code) and name — the portal's "New user lead" / "Edit user lead" dialog. */
export function UserLeadForm({
  initial = userLeadDefaults,
  onSubmit,
  submitLabel,
  error,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<UserLeadValues>(makeUserLeadSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<UserLeadValues, any, UserLeadValues>({
    defaultValues: initial,
    resolver,
    mode: 'onTouched',
  });
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="phone"
        label={t('crm.userLeads.phoneWithCountryCode')}
        keyboardType="phone-pad"
        testID="user-lead-phone"
      />
      <TextField
        control={control}
        name="name"
        label={t('shell.common.name')}
        testID="user-lead-name"
      />
      <DuncitButton
        label={submitLabel}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="user-lead-save"
      />
      {error ? (
        <Text color="$danger" role="alert" testID="user-lead-save-error">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
