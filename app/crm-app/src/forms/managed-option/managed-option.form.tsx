import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { Toggle } from '@/components/Toggle';
import { DuncitButton } from '@/components/DuncitButton';
import { SURFACE } from '@/components/surface';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { makeManagedOptionSchema, type ManagedOptionValues } from './managed-option.types';

interface Props {
  values: ManagedOptionValues;
  /** The list's own example name (e.g. Power Backup). */
  placeholder: string;
  busy: boolean;
  onSubmit: (values: ManagedOptionValues) => Promise<void>;
  onCancel: () => void;
  testID: string;
}

/** Add or edit one entry — the portal's inline row: order, name, active, Save / Cancel. */
export function ManagedOptionForm({
  values,
  placeholder,
  busy,
  onSubmit,
  onCancel,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<ManagedOptionValues>(makeManagedOptionSchema(t)),
    [t],
  );
  const { control, handleSubmit } = useForm({ defaultValues: values, resolver, mode: 'onTouched' });
  return (
    <YStack {...SURFACE} gap="$3" testID={testID}>
      <TextField
        control={control}
        name="name"
        label={t('shell.common.name')}
        placeholder={placeholder}
        testID={`${testID}-name`}
      />
      <TextField
        control={control}
        name="sort_order"
        label={t('shell.common.order')}
        keyboardType="number-pad"
        numeric={{ nullable: true }}
        testID={`${testID}-order`}
      />
      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <XStack alignItems="center" gap="$3">
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label={t('crm.common.active')}
              testID={`${testID}-active`}
            />
            <Text>{t('crm.common.active')}</Text>
          </XStack>
        )}
      />
      <XStack gap="$2">
        <YStack flex={1}>
          <DuncitButton
            label={t('shell.common.cancel')}
            onPress={onCancel}
            variant="outline"
            disabled={busy}
            fullWidth
            testID={`${testID}-cancel`}
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('shell.common.save')}
            onPress={handleSubmit(onSubmit)}
            loading={busy}
            fullWidth
            testID={`${testID}-save`}
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
