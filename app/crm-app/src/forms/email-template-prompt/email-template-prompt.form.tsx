import { useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  EMAIL_PROMPT_MAX,
  makeEmailPromptSchema,
  type EmailPromptValues,
} from './email-template-prompt.types';

export interface EmailAiPrompt {
  key: string;
  role: string;
  content: string;
  variables: readonly {
    name: string;
    label: string;
    description?: string | null;
    required: boolean;
  }[];
}

interface Props {
  prompt: EmailAiPrompt;
  /** Which of this prompt's buttons is working. */
  working: 'save' | 'reset' | null;
  onSubmit: (values: EmailPromptValues) => Promise<void>;
  /** Ask to put the shipped default back (the screen confirms first). */
  onReset: () => void;
}

/**
 * One of the two prompts behind "Seed MJML with AI": what the AI is told
 * (SYSTEM) or how a manager's request reaches it (USER). The placeholders the
 * CRM fills in are listed; the required ones (filled chips) cannot be removed.
 */
export function EmailPromptForm({ prompt, working, onSubmit, onReset }: Readonly<Props>) {
  const { t } = useTranslation();
  const required = useMemo(
    () => prompt.variables.filter((v) => v.required).map((v) => v.name),
    [prompt.variables],
  );
  const resolver = useMemo(
    () => formResolver<EmailPromptValues>(makeEmailPromptSchema(t, required)),
    [t, required],
  );
  const { control, handleSubmit, reset, formState } = useForm<EmailPromptValues>({
    defaultValues: { content: prompt.content },
    resolver,
    mode: 'onChange',
  });
  const content = useWatch({ control, name: 'content' });
  const isSystem = prompt.role === 'SYSTEM';

  useEffect(() => {
    reset({ content: prompt.content });
  }, [prompt.content, reset]);

  return (
    <Card
      title={isSystem ? t('crm.emailSettings.systemPrompt') : t('crm.emailSettings.userPrompt')}
      testID={`email-prompt-${prompt.key}`}
    >
      <Text color="$muted" fontSize="$2">
        {isSystem ? t('crm.emailSettings.systemPromptHint') : t('crm.emailSettings.userPromptHint')}
      </Text>
      {prompt.variables.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap="$2">
            {prompt.variables.map((variable) => (
              <ToneChip
                key={variable.name}
                label={`{{${variable.name}}}`}
                tone={variable.required ? 'info' : 'default'}
              />
            ))}
          </XStack>
        </ScrollView>
      ) : null}
      <TextField
        control={control}
        name="content"
        label={t('crm.emailSettings.promptText')}
        hint={t('crm.emailSettings.promptLength', {
          vars: { count: content.length, max: EMAIL_PROMPT_MAX },
        })}
        multiline
        testID={`email-prompt-input-${prompt.key}`}
      />
      <YStack gap="$2">
        <DuncitButton
          label={t('crm.emailSettings.savePrompt')}
          onPress={handleSubmit(onSubmit)}
          loading={working === 'save'}
          disabled={!formState.isDirty || working === 'reset'}
          fullWidth
          testID={`email-prompt-save-${prompt.key}`}
        />
        <DuncitButton
          label={t('crm.emailSettings.resetPrompt')}
          onPress={onReset}
          variant="outline"
          loading={working === 'reset'}
          disabled={working === 'save'}
          fullWidth
          testID={`email-prompt-reset-${prompt.key}`}
        />
      </YStack>
    </Card>
  );
}
