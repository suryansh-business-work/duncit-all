import { useId, useMemo } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle, Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { LEAD_EVIDENCE_TEXT_MAX, LEAD_EVIDENCE_URL_MAX, leadEvidenceSchema } from './lead-evidence.schema';
import type { LeadEvidenceFormProps, LeadEvidenceFormValues } from './lead-evidence.types';

type TextName = 'evidence' | 'source_url' | 'notes';

interface FieldProps {
  control: Control<LeadEvidenceFormValues>;
  name: TextName;
  label: string;
  hint: string;
  required?: boolean;
  multiline?: boolean;
}

/** One text field of the decision, its error replacing the hint. */
function EvidenceField({ control, name, label, hint, required, multiline }: Readonly<FieldProps>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          size="small"
          label={label}
          required={required}
          fullWidth
          multiline={multiline}
          minRows={multiline ? 3 : undefined}
          type={name === 'source_url' ? 'url' : 'text'}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? hint}
          slotProps={{
            htmlInput: {
              'data-testid': `lead-evidence-${name}`,
              maxLength: name === 'source_url' ? LEAD_EVIDENCE_URL_MAX : LEAD_EVIDENCE_TEXT_MAX,
            },
          }}
        />
      )}
    />
  );
}

/** Lead Quality Score → record one item's evidence: Verified (earns its points), Not met, or clear the decision. */
export default function LeadEvidenceForm({
  open,
  itemLabel,
  initialValues,
  submitting,
  errors = [],
  onSubmit,
  onClose,
}: Readonly<LeadEvidenceFormProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const schema = useMemo(() => leadEvidenceSchema(t), [t]);
  const { control, handleSubmit } = useForm<LeadEvidenceFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: initialValues,
  });
  const status = useWatch({ control, name: 'status' });
  const verified = status === 'VERIFIED';

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby={titleId}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="lead-evidence-form">
        <DialogTitle id={titleId}>{t('crm.leadQualityTab.formTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {itemLabel}
          </Typography>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="lead-evidence-refused">
              <AlertTitle>{t('crm.leadQualityTab.refused')}</AlertTitle>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </Box>
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  size="small"
                  label={t('crm.leadQualityTab.decision')}
                  fullWidth
                  slotProps={{ select: { native: true }, htmlInput: { 'data-testid': 'lead-evidence-status' } }}
                >
                  <option value="VERIFIED">{t('crm.leadQualityTab.decisionVerified')}</option>
                  <option value="FAILED">{t('crm.leadQualityTab.decisionFailed')}</option>
                  <option value="PENDING">{t('crm.leadQualityTab.decisionClear')}</option>
                </TextField>
              )}
            />
            {status === 'PENDING' ? (
              <Alert severity="info" data-testid="lead-evidence-clear-hint">
                {t('crm.leadQualityTab.clearHint')}
              </Alert>
            ) : (
              <>
                <EvidenceField
                  control={control}
                  name="evidence"
                  label={verified ? t('crm.leadQualityTab.evidence') : t('crm.leadQualityTab.reason')}
                  hint={verified ? t('crm.leadQualityTab.evidenceHint') : t('crm.leadQualityTab.reasonHint')}
                  required
                  multiline
                />
                <EvidenceField
                  control={control}
                  name="source_url"
                  label={t('crm.leadQualityTab.sourceLink')}
                  hint={t('crm.leadQualityTab.sourceHint')}
                />
                <EvidenceField
                  control={control}
                  name="notes"
                  label={t('crm.leadQualityTab.notes')}
                  hint={t('crm.leadQualityTab.notesHint')}
                  multiline
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={submitting}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={submitting} data-testid="lead-evidence-submit">
            {t('shell.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
