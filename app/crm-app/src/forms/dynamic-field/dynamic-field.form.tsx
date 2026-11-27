import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Label, Text, XStack, YStack } from 'tamagui';

import { ChoiceField } from '@/components/ChoiceField';
import { DuncitButton } from '@/components/DuncitButton';
import { SelectChip } from '@/components/mobile/SelectChip';
import { ToggleField } from '@/components/settings-editors/ToggleField';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { DynamicFieldOptions } from './DynamicFieldOptions';
import {
  DYNAMIC_FIELD_APPLIES,
  DYNAMIC_FIELD_KIND_KEY,
  DYNAMIC_FIELD_KINDS,
  makeDynamicFieldSchema,
  type DynamicFieldValues,
} from './dynamic-field.types';

interface Props {
  values: DynamicFieldValues;
  onSubmit: (values: DynamicFieldValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Create / edit one dynamic field — the portal's form: label, type (Single or
 * Multiple for a Select, with its options), placeholder, default value, hint,
 * the lead kinds it applies to, Required and Active. The storage key is made
 * from the label, so there is no key field.
 */
export function DynamicFieldForm({ values, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<DynamicFieldValues>(makeDynamicFieldSchema(t)), [t]);
  const { control, handleSubmit, formState } = useForm({
    defaultValues: values,
    resolver,
    mode: 'onTouched',
  });
  const kind = useWatch({ control, name: 'kind' });
  const busy = formState.isSubmitting;
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="label"
        label={t('crm.managedynamicfieldspage.label')}
        hint={t('crm.managedynamicfieldspage.whatTheUserSeesOnThe')}
        testID="dynamic-field-label"
      />
      <ChoiceField
        control={control}
        name="kind"
        label={t('shell.common.type')}
        options={DYNAMIC_FIELD_KINDS.map((value) => ({
          value,
          label: t(DYNAMIC_FIELD_KIND_KEY[value]),
        }))}
        testID="dynamic-field-kind"
      />
      {kind === 'select' ? (
        <Controller
          control={control}
          name="multi"
          render={({ field }) => (
            <XStack
              gap="$2"
              role="radiogroup"
              aria-label={t('crm.managedynamicfieldspage.selectionMode')}
            >
              <SelectChip
                label={t('crm.managedynamicfieldspage.single')}
                accessibilityLabel={`${t('crm.managedynamicfieldspage.single')}, ${t('crm.managedynamicfieldspage.singleSelect')}`}
                onPress={() => field.onChange(false)}
                selected={!field.value}
                testID="dynamic-field-single"
              />
              <SelectChip
                label={t('crm.managedynamicfieldspage.multiple')}
                accessibilityLabel={`${t('crm.managedynamicfieldspage.multiple')}, ${t('crm.managedynamicfieldspage.multiSelect')}`}
                onPress={() => field.onChange(true)}
                selected={field.value}
                testID="dynamic-field-multiple"
              />
            </XStack>
          )}
        />
      ) : null}
      <TextField
        control={control}
        name="placeholder"
        label={t('crm.managedynamicfieldspage.placeholder')}
        testID="dynamic-field-placeholder"
      />
      <TextField
        control={control}
        name="default_value"
        label={t('crm.managedynamicfieldspage.defaultValue')}
        testID="dynamic-field-default"
      />
      <TextField
        control={control}
        name="hint"
        label={t('crm.managedynamicfieldspage.hint')}
        hint={t('crm.managedynamicfieldspage.shownBeneathTheInputAsGuidance')}
        testID="dynamic-field-hint"
      />
      {kind === 'select' ? (
        <DynamicFieldOptions control={control} errors={formState.errors} />
      ) : null}
      <YStack gap="$2" role="group" aria-label={t('crm.common.appliesTo')}>
        <Label fontWeight="600">{t('crm.common.appliesTo')}</Label>
        {DYNAMIC_FIELD_APPLIES.map(({ flag, labelKey }) => (
          <ToggleField
            key={flag}
            control={control}
            name={flag}
            label={t(labelKey)}
            testID={`dynamic-field-${flag}`}
          />
        ))}
        {formState.errors.applies_to_venue ? (
          <Text color="$danger" fontSize="$2" role="alert" testID="dynamic-field-applies-error">
            {formState.errors.applies_to_venue.message}
          </Text>
        ) : null}
      </YStack>
      <ToggleField
        control={control}
        name="required"
        label={t('crm.managedynamicfieldspage.required')}
        testID="dynamic-field-required"
      />
      <ToggleField
        control={control}
        name="is_active"
        label={t('crm.common.active')}
        testID="dynamic-field-active"
      />
      <XStack gap="$2">
        <YStack flex={1}>
          <DuncitButton
            label={t('shell.common.cancel')}
            onPress={onCancel}
            variant="outline"
            disabled={busy}
            fullWidth
            testID="dynamic-field-cancel"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={busy ? t('shell.common.saving') : t('crm.managedynamicfieldspage.saveField')}
            onPress={handleSubmit(onSubmit)}
            loading={busy}
            fullWidth
            testID="dynamic-field-save"
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
