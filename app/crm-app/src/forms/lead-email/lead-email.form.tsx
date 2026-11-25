import { useWatch, type Control } from 'react-hook-form';
import { YStack } from 'tamagui';

import { ChoiceField } from '@/components/ChoiceField';
import { TextField } from '@/components/TextField';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { LeadEmailValues, TemplateBody } from './lead-email.types';
import { ProviderPicker } from './ProviderPicker';
import { TemplatePicker } from './TemplatePicker';

interface Props {
  control: Control<LeadEmailValues>;
  entity: LeadKind;
  leadName: string;
  /** The lead's values by slug, filled into a template's placeholders. */
  leadValues: Readonly<Record<string, string>>;
  onBody: (body: TemplateBody) => void;
}

/**
 * The composer's fields, as the portal's compose window lays them out: the
 * provider, who it goes to, then a template or a plain-text subject and message.
 */
export function LeadEmailFields({
  control,
  entity,
  leadName,
  leadValues,
  onBody,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const mode = useWatch({ control, name: 'mode' });
  const to = useWatch({ control, name: 'to' });
  return (
    <YStack gap="$3">
      <ProviderPicker control={control} />
      <TextField
        control={control}
        name="to"
        label={t('crm.compose.toEmail')}
        keyboardType="email-address"
        autoComplete="email"
        testID="compose-to"
      />
      <ChoiceField
        control={control}
        name="mode"
        label={t('crm.components.emailContentType')}
        options={[
          { value: 'template', label: t('crm.components.template') },
          { value: 'text', label: t('crm.components.simpleText') },
        ]}
        testID="compose-mode"
      />
      {mode === 'template' ? (
        <TemplatePicker
          control={control}
          entity={entity}
          leadName={leadName}
          leadEmail={to}
          leadValues={leadValues}
          onBody={onBody}
        />
      ) : (
        <>
          <TextField
            control={control}
            name="subject"
            label={t('crm.common.subject')}
            testID="compose-subject"
          />
          <TextField
            control={control}
            name="message"
            label={t('crm.components.message')}
            multiline
            testID="compose-message"
          />
        </>
      )}
    </YStack>
  );
}
