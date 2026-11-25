import type { Control, FieldArrayWithId } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { IconButton } from '@/components/email-templates/IconButton';
import { SURFACE } from '@/components/surface';
import { TextField } from '@/components/TextField';
import type { TemplateDraft, TemplateVariable } from '@/features/email-templates/draft';
import { useTranslation } from '@/hooks/useTranslation';
import { shareText } from './VariableChips';

interface Props {
  control: Control<TemplateDraft>;
  fields: FieldArrayWithId<TemplateDraft, 'variables'>[];
  /** The variables as typed right now (for the labels that follow an edited key). */
  values: readonly TemplateVariable[];
  onRemove: (index: number) => void;
}

/**
 * The template's variables: one default value each (used by the preview and
 * test sends, and as the fallback when a lead has no value), then each one's
 * key and description, editable in place.
 */
export function DeclaredVariables({ control, fields, values, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3">
      <YStack gap="$1">
        <Text fontWeight="700" role="heading">
          {t('crm.emailTemplates.defaultValues')}
        </Text>
        <Text color="$muted" fontSize="$2">
          {t('crm.emailTemplates.usedForPreviewAndAsThe')}
        </Text>
      </YStack>
      {fields.length === 0 ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.emailTemplates.addVariablesFirst')}
        </Text>
      ) : null}
      {fields.map((field, index) => {
        const key = values[index]?.key ?? field.key;
        return (
          <TextField
            key={field.id}
            control={control}
            name={`variables.${index}.sample`}
            label={key}
            placeholder={
              values[index]?.description || t('crm.emailTemplates.valueFor', { vars: { key } })
            }
            testID={`variable-sample-${index}`}
          />
        );
      })}
      <Text fontWeight="700" role="heading">
        {t('crm.emailTemplates.declaredVariables')}
      </Text>
      {fields.length === 0 ? (
        <Text color="$muted" fontSize="$2">
          {t('crm.emailTemplates.addFromTheChipsAbove')}
        </Text>
      ) : null}
      {fields.map((field, index) => {
        const key = values[index]?.key ?? field.key;
        return (
          <YStack key={field.id} {...SURFACE} gap="$2">
            <TextField
              control={control}
              name={`variables.${index}.key`}
              label={t('crm.emailTemplates.slug')}
              testID={`variable-key-${index}`}
            />
            <TextField
              control={control}
              name={`variables.${index}.description`}
              label={t('shell.common.description')}
              placeholder={t('crm.emailTemplates.variableDescriptionPlaceholder')}
              testID={`variable-description-${index}`}
            />
            <XStack justifyContent="flex-end" gap="$1">
              <IconButton
                icon="share"
                label={t('crmApp.emailTemplates.shareVariable', { vars: { key } })}
                onPress={() => shareText(`{{ ${key} }}`)}
                testID={`variable-share-${index}`}
              />
              <IconButton
                icon="delete-outline"
                tone="danger"
                label={t('shell.a11y.removeNamed', { vars: { name: key } })}
                onPress={() => onRemove(index)}
                testID={`variable-remove-${index}`}
              />
            </XStack>
          </YStack>
        );
      })}
    </YStack>
  );
}
