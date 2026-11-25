import type { Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import type { TemplateDraft } from '@/features/email-templates/draft';
import { useTranslation } from '@/hooks/useTranslation';

/** Name and subject (variables are filled into the subject too); the slug is shown, never edited. */
export function EditorDetailsCard({
  control,
  slug,
}: Readonly<{ control: Control<TemplateDraft>; slug: string }>) {
  const { t } = useTranslation();
  return (
    <Card>
      <TextField
        control={control}
        name="name"
        label={t('shell.common.name')}
        testID="template-name"
      />
      <YStack gap="$1">
        <Text fontWeight="600">{t('crm.emailTemplates.slug')}</Text>
        <Text color="$muted" selectable testID="template-slug">
          {slug}
        </Text>
        <Text color="$muted" fontSize="$2">
          {t('crm.emailTemplates.usedByCodeCannotBeEdited')}
        </Text>
      </YStack>
      <TextField
        control={control}
        name="subject"
        label={t('crm.common.subject')}
        hint={t('crm.emailTemplates.subjectHint')}
        testID="template-subject"
      />
    </Card>
  );
}
