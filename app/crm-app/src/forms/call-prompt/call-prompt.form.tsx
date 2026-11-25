import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Switch, Text, XStack, YStack } from 'tamagui';

import { ChoiceField } from '@/components/ChoiceField';
import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  CALL_PROMPT_LANGUAGES,
  makeCallPromptSchema,
  type CallPromptValues,
} from './call-prompt.types';

interface Props {
  values: CallPromptValues;
  submitLabel: string;
  onSubmit: (values: CallPromptValues) => Promise<void>;
}

/** Name, description, language, the context the AI agent speaks in, and Active — the portal's form. */
export function CallPromptForm({ values, submitLabel, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<CallPromptValues>(makeCallPromptSchema(t)), [t]);
  const { control, handleSubmit, formState } = useForm({
    defaultValues: values,
    resolver,
    mode: 'onTouched',
  });
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="name"
        label={t('shell.common.name')}
        hint={t('crm.callPrompts.nameHint')}
        testID="prompt-name"
      />
      <TextField
        control={control}
        name="description"
        label={t('shell.common.description')}
        hint={t('crm.callPrompts.descriptionHint')}
        testID="prompt-description"
      />
      <ChoiceField
        control={control}
        name="language"
        label={t('crm.common.language')}
        options={CALL_PROMPT_LANGUAGES.map((l) => ({ value: l.value, label: t(l.labelKey) }))}
        testID="prompt-language"
      />
      <Text color="$muted" fontSize="$2">
        {t('crm.callPrompts.languageHint')}
      </Text>
      <TextField
        control={control}
        name="context"
        label={t('crm.forms.staticContent')}
        hint={t('crm.callPrompts.contextHint')}
        multiline
        testID="prompt-context"
      />
      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <XStack alignItems="center" gap="$3">
            <Switch
              size="$3"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label={t('crm.common.active')}
              testID="prompt-active"
            >
              <Switch.Thumb />
            </Switch>
            <Text>{t('crm.common.active')}</Text>
          </XStack>
        )}
      />
      <DuncitButton
        label={formState.isSubmitting ? t('shell.common.saving') : submitLabel}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="prompt-save"
      />
    </YStack>
  );
}
