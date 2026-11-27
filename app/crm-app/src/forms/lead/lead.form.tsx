import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FormLayout } from '@/components/mobile/FormLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { ContactsEditor } from './ContactsEditor';
import { DuplicateWarnings } from './DuplicateWarnings';
import { LeadBasicsSection } from './LeadBasicsSection';
import { LeadTrackingSection } from './LeadTrackingSection';
import { makeLeadSchema, type LeadFormProps, type LeadFormValues } from './lead.types';

/**
 * Create or edit a lead of any kind — the portal's rules, the fields a person
 * in the field fills in. The fields scroll; Save stays pinned at the bottom,
 * above the keyboard, with what stops it right over it.
 */
export function LeadForm({
  kind,
  leadId,
  initial,
  options,
  onSubmit,
  error,
  intro,
}: Readonly<LeadFormProps>) {
  const { t } = useTranslation();
  // raw: the shared schema checks only some fields; the rest (area, notes, owner, follow-up) must reach the save.
  const resolver = useMemo(
    () => formResolver<LeadFormValues>(makeLeadSchema(kind, t), { raw: true }),
    [kind, t],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, setValue, formState } = useForm<
    LeadFormValues,
    any,
    LeadFormValues
  >({
    defaultValues: initial,
    resolver,
    mode: 'onTouched',
  });
  const errorCount = Object.keys(formState.errors).length;

  const footer = (
    <YStack flex={1} gap="$2">
      {formState.isSubmitted && errorCount > 0 ? (
        <Text color="$danger" role="alert" testID="lead-form-invalid">
          {t('crmApp.editor.fixErrors', { count: errorCount, vars: { count: errorCount } })}
        </Text>
      ) : null}
      {error ? (
        <Text color="$danger" role="alert" testID="lead-save-error">
          {error}
        </Text>
      ) : null}
      <DuncitButton
        label={leadId ? t('crmApp.editor.save') : t('crmApp.editor.create')}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        fullWidth
        testID="lead-save"
      />
    </YStack>
  );

  return (
    <FormLayout footer={footer}>
      {intro ? <Text color="$muted">{intro}</Text> : null}
      <LeadBasicsSection kind={kind} control={control} options={options} />
      <ContactsEditor control={control} />
      <DuplicateWarnings kind={kind} leadId={leadId} control={control} />
      <LeadTrackingSection kind={kind} control={control} setValue={setValue} options={options} />
    </FormLayout>
  );
}
