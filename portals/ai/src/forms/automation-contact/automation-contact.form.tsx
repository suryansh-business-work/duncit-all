import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  automationContactInitialValues,
  buildAutomationContactSchema,
  type AutomationContactFormProps,
  type AutomationContactFormValues,
} from './automation-contact.types';

export default function AutomationContactForm({
  channel,
  showDeliver = false,
  submitting,
  submitLabel,
  initialValues,
  onSubmit,
}: Readonly<AutomationContactFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildAutomationContactSchema(t, channel), [t, channel]);
  const { control, handleSubmit, reset, watch, formState } = useForm<AutomationContactFormValues, any, AutomationContactFormValues>({
    defaultValues: { ...automationContactInitialValues, ...initialValues },
    resolver: zodResolver(schema) as unknown as Resolver<AutomationContactFormValues, any, AutomationContactFormValues>,
    mode: 'onChange',
  });

  useEffect(() => {
    reset({ ...automationContactInitialValues, ...initialValues });
  }, [initialValues, reset]);

  const deliver = watch('deliver');
  const submit = handleSubmit((values) => onSubmit(values));
  const whatsapp = channel === 'WHATSAPP';

  return (
    <form noValidate onSubmit={submit} data-testid="automation-contact-form">
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="name"
          label={t('ai.automation.test.contactName')}
          required
          size="small"
          slotProps={{ htmlInput: { 'data-testid': 'automation-contact-name' } }}
        />
        {whatsapp ? (
          <RhfTextField
            control={control}
            name="phone"
            label={t('ai.automation.test.phone')}
            hint={t('ai.automation.test.phoneHint')}
            required
            size="small"
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'automation-contact-phone' } }}
          />
        ) : (
          <RhfTextField
            control={control}
            name="email"
            label={t('ai.automation.test.email')}
            type="email"
            required
            size="small"
            slotProps={{ htmlInput: { 'data-testid': 'automation-contact-email' } }}
          />
        )}
        {!whatsapp && (
          <RhfTextField
            control={control}
            name="subject"
            label={t('ai.automation.test.subject')}
            size="small"
            slotProps={{ htmlInput: { 'data-testid': 'automation-contact-subject' } }}
          />
        )}
        <RhfTextField
          control={control}
          name="text"
          label={t('ai.automation.test.firstMessage')}
          hint={t('ai.automation.test.firstMessageHint')}
          multiline
          minRows={2}
          size="small"
          slotProps={{ htmlInput: { 'data-testid': 'automation-contact-text' } }}
        />
        {showDeliver && (
          <Controller
            control={control}
            name="deliver"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_event, checked) => field.onChange(checked)}
                    slotProps={{ input: { 'aria-describedby': 'automation-deliver-hint' } }}
                    data-testid="automation-contact-deliver"
                  />
                }
                label={t('ai.automation.test.deliver')}
              />
            )}
          />
        )}
        {showDeliver && deliver && (
          <Alert severity="warning" id="automation-deliver-hint">
            {t('ai.automation.test.deliverHint')}
          </Alert>
        )}
        <DuncitButton
          type="submit"
          variant="contained"
          disabled={submitting || !formState.isValid}
          data-testid="automation-contact-submit"
        >
          {submitLabel}
        </DuncitButton>
      </Stack>
    </form>
  );
}
