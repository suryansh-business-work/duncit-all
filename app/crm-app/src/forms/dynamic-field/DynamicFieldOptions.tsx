import { MaterialIcons } from '@expo/vector-icons';
import { useFieldArray, type Control, type FieldErrors } from 'react-hook-form';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { IconAction } from '@/components/settings-editors/IconAction';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import type { DynamicFieldValues } from './dynamic-field.types';

interface Props {
  control: Control<DynamicFieldValues>;
  errors: FieldErrors<DynamicFieldValues>;
}

/** A Select's options as value / label rows — never as one-per-line text — with add and remove. */
export function DynamicFieldOptions({ control, errors }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  // With option rows on screen the resolver files a list error under `root`.
  const message = errors.options?.root?.message ?? errors.options?.message;
  return (
    <YStack gap="$2" role="group" aria-label={t('crm.managedynamicfieldspage.options')}>
      <Text fontWeight="700" color="$muted">
        {t('crm.managedynamicfieldspage.options')}
      </Text>
      {fields.map((field, index) => (
        <XStack key={field.id} gap="$2" alignItems="flex-end">
          <YStack flex={1}>
            <TextField
              control={control}
              name={`options.${index}.value`}
              label={t('crm.managedynamicfieldspage.value')}
              testID={`dynamic-field-option-value-${index}`}
            />
          </YStack>
          <YStack flex={1}>
            <TextField
              control={control}
              name={`options.${index}.label`}
              label={t('crm.managedynamicfieldspage.label')}
              testID={`dynamic-field-option-label-${index}`}
            />
          </YStack>
          <IconAction
            icon="delete"
            label={t('crm.managedynamicfieldspage.removeOption')}
            onPress={() => remove(index)}
            danger
            testID={`dynamic-field-option-remove-${index}`}
          />
        </XStack>
      ))}
      {message ? (
        <Text color="$danger" fontSize="$2" role="alert" testID="dynamic-field-options-error">
          {message}
        </Text>
      ) : null}
      <XStack>
        <DuncitButton
          label={t('crm.managedynamicfieldspage.addOption')}
          onPress={() => append({ value: '', label: '' })}
          variant="ghost"
          size="sm"
          icon={<MaterialIcons name="add" size={18} color={theme.accentText?.val} />}
          testID="dynamic-field-add-option"
        />
      </XStack>
    </YStack>
  );
}
