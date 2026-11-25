import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { CRM_SERVICE_TARGETS, crmPickServiceTargets, type CrmServiceTargets } from '@duncit/utils';

import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { ServiceFormActions } from './ServiceFormActions';
import { ServiceTargetSwitches } from './ServiceTargetSwitches';
import {
  makeEditServiceOfferedSchema,
  type EditServiceOfferedValues,
} from './service-offered.types';

interface Props {
  values: EditServiceOfferedValues;
  busy: boolean;
  onSubmit: (values: EditServiceOfferedValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Edit Service Offered — the portal's dialog: the title (a duplicate in the
 * same category is refused by the server), Active and the lead types. Its
 * Super → Category → Sub slot stays fixed. Save waits for a title and a lead type.
 */
export function EditServiceOfferedForm({ values, busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<EditServiceOfferedValues>(makeEditServiceOfferedSchema(t)),
    [t],
  );
  const { control, handleSubmit, setValue, formState } = useForm({
    defaultValues: values,
    resolver,
    mode: 'onChange',
  });
  const watched = useWatch({ control });
  const setTargets = (next: CrmServiceTargets) => {
    for (const target of CRM_SERVICE_TARGETS) {
      setValue(target.flag, next[target.flag], { shouldValidate: true });
    }
  };

  return (
    <YStack gap="$4">
      <TextField
        control={control}
        name="title"
        label={t('shell.common.title')}
        hint={t('crm.data.duplicateTitlesInTheSameCategory')}
        testID="service-edit-title"
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
              testID="service-edit-active"
            />
            <Text>{t('crm.common.active')}</Text>
          </XStack>
        )}
      />
      <Separator borderColor="$borderColor" />
      <ServiceTargetSwitches value={crmPickServiceTargets(watched)} onChange={setTargets} />
      <ServiceFormActions
        submitLabel={busy ? t('shell.common.saving') : t('shell.common.save')}
        disabled={!formState.isValid}
        busy={busy}
        onSubmit={handleSubmit(onSubmit)}
        onCancel={onCancel}
        testID="service-edit"
      />
    </YStack>
  );
}
