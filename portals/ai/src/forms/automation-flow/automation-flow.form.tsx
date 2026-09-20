import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  automationFlowInitialValues,
  buildAutomationFlowSchema,
  type AutomationFlowFormProps,
  type AutomationFlowFormValues,
} from './automation-flow.types';

/** The "New flow" dialog. The graph itself is drawn on the next screen. */
export default function AutomationFlowForm({ open, submitting, onClose, onSubmit }: Readonly<AutomationFlowFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildAutomationFlowSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<AutomationFlowFormValues, any, AutomationFlowFormValues>({
    defaultValues: automationFlowInitialValues,
    resolver: zodResolver(schema) as unknown as Resolver<AutomationFlowFormValues, any, AutomationFlowFormValues>,
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) reset(automationFlowInitialValues);
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="automation-flow-form-title">
      <form noValidate onSubmit={submit} data-testid="automation-flow-form">
        <DialogTitle id="automation-flow-form-title">{t('ai.automation.form.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <RhfTextField
              control={control}
              name="name"
              label={t('ai.automation.form.name')}
              hint={t('ai.automation.form.nameHint')}
              required
              slotProps={{ htmlInput: { 'data-testid': 'automation-flow-name' } }}
            />
            <RhfTextField
              control={control}
              name="description"
              label={t('ai.automation.form.description')}
              hint={t('ai.automation.form.descriptionHint')}
              multiline
              minRows={2}
              slotProps={{ htmlInput: { 'data-testid': 'automation-flow-description' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} data-testid="automation-flow-cancel">
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton
            type="submit"
            variant="contained"
            disabled={submitting || !formState.isValid}
            data-testid="automation-flow-submit"
          >
            {t('ai.automation.form.create')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
