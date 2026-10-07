import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';
import {
  POD_REQUEST_LIMIT_MAX,
  makePodRequestLimitSchema,
  type PodRequestLimitFormProps,
  type PodRequestLimitFormValues,
} from './pod-request-limit.types';

/**
 * How many Pod Requests a venue (per venue) or a host may send each month.
 * When Duncit has set a cap for this partner it is shown above the box — it
 * wins over what is saved here. mWeb twin: components/pod-request-limit-form.
 */
export function PodRequestLimitForm({
  label,
  initialLimit,
  override,
  saving,
  saved,
  error,
  onSubmit,
  testID,
}: Readonly<PodRequestLimitFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePodRequestLimitSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<PodRequestLimitFormValues>({
    defaultValues: { limit: String(initialLimit) },
    resolver: formResolver<PodRequestLimitFormValues>(schema),
    mode: 'onTouched',
  });

  // A refetch (or another venue picked) replaces what the box holds.
  useEffect(() => {
    reset({ limit: String(initialLimit) });
  }, [initialLimit, reset]);

  // The schema has already turned the text into a whole number in range.
  const submit = handleSubmit((values) => onSubmit(Number(values.limit)));

  return (
    <YStack gap={12} testID={testID}>
      {override === null ? null : (
        <Text testID={`${testID}-override`} role="status" fontSize={13} color="$info">
          {t('podRequests.limitOverridden', { vars: { limit: override } })}
        </Text>
      )}
      <FormTextField
        control={control}
        name="limit"
        label={label}
        hint={t('podRequests.limitHint')}
        keyboardType="number-pad"
        digitsOnly
        maxLength={String(POD_REQUEST_LIMIT_MAX).length}
      />
      {error ? (
        <Text role="alert" testID={`${testID}-error`} fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text role="status" testID={`${testID}-saved`} fontSize={13} color="$success">
          {t('podRequests.limitSaved')}
        </Text>
      ) : null}
      <PrimaryButton
        testID={`${testID}-save`}
        label={t('podRequests.save')}
        onPress={() => fireAndForget(submit())}
        disabled={saving}
        loading={saving}
      />
    </YStack>
  );
}
