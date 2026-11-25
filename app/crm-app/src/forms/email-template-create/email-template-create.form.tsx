import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useForm, useWatch } from 'react-hook-form';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { crmEmailTemplateSlug } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { TARGET_CHOICES } from '@/features/email-templates/targets';
import { EmailAiDialog } from '@/forms/email-template-ai';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  emailTemplateCreateDefaults,
  makeEmailTemplateCreateSchema,
  type EmailTemplateCreateValues,
} from './email-template-create.types';
import { TargetPicker } from './TargetPicker';

interface Props {
  /** The body the template starts with: the shared starter, or what the AI wrote. */
  mjml: string;
  onSeed: (mjml: string) => void;
  onSubmit: (values: EmailTemplateCreateValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * A new template, as the portal's create dialog asks for it: first who it is
 * for, then its name, slug (derived from the name when blank) and subject,
 * with an AI seed for the body. Changing the audience keeps what was typed.
 */
export function EmailTemplateCreateForm({ mjml, onSeed, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [aiOpen, setAiOpen] = useState(false);
  const resolver = useMemo(
    () => formResolver<EmailTemplateCreateValues>(makeEmailTemplateCreateSchema(t)),
    [t],
  );
  const { control, handleSubmit, setValue, formState } = useForm<EmailTemplateCreateValues>({
    defaultValues: emailTemplateCreateDefaults,
    resolver,
  });
  const [target, name, subject] = useWatch({ control, name: ['target', 'name', 'subject'] });
  const ready = Boolean(target && name.trim() && subject.trim() && mjml);

  if (!target) return <TargetPicker onPick={(picked) => setValue('target', picked)} />;
  return (
    <YStack gap="$3">
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <Text color="$muted" fontSize="$2">
          {t('crm.emailTemplates.typeLabel')}
        </Text>
        {TARGET_CHOICES.filter((c) => c.value === target).map((c) => (
          <Text key={c.value} fontWeight="700">
            {t(c.labelKey)}
          </Text>
        ))}
        <DuncitButton
          label={t('crm.emailTemplates.change')}
          onPress={() => setValue('target', '')}
          variant="ghost"
          size="sm"
          testID="template-create-change"
        />
      </XStack>
      <TextField
        control={control}
        name="name"
        label={t('shell.common.name')}
        testID="template-create-name"
      />
      <TextField
        control={control}
        name="slug"
        label={t('crm.emailTemplates.slug')}
        placeholder={crmEmailTemplateSlug(name) || t('crm.emailTemplates.slugExample')}
        hint={t('crm.emailTemplates.stableCodeKeyAutoDerivedFrom')}
        testID="template-create-slug"
      />
      <TextField
        control={control}
        name="subject"
        label={t('crm.common.subject')}
        testID="template-create-subject"
      />
      <DuncitButton
        label={t('crm.emailTemplates.seedMjmlWithAi')}
        onPress={() => setAiOpen(true)}
        variant="outline"
        icon={<MaterialIcons name="auto-awesome" size={18} color={theme.accentText?.val} />}
        testID="template-create-ai"
      />
      <XStack justifyContent="flex-end" gap="$2">
        <DuncitButton
          label={t('shell.common.cancel')}
          onPress={onCancel}
          variant="ghost"
          disabled={formState.isSubmitting}
          testID="template-create-cancel"
        />
        <DuncitButton
          label={
            formState.isSubmitting
              ? t('crm.emailTemplates.creating')
              : t('crm.emailTemplates.create')
          }
          onPress={handleSubmit(onSubmit)}
          loading={formState.isSubmitting}
          disabled={!ready}
          testID="template-create-submit"
        />
      </XStack>
      <EmailAiDialog
        open={aiOpen}
        currentMjml={mjml}
        target={target}
        onApply={onSeed}
        onClose={() => setAiOpen(false)}
      />
    </YStack>
  );
}
