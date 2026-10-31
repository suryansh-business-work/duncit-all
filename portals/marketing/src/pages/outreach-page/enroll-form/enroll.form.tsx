import { useEffect, useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { PIPELINES, PIPELINE_LABEL, STAGE_LABEL } from '../../leads-page/copy';
import { ENROLLABLE_STAGES, blankEnrollValues, enrollSchema, toLeadFilter, type EnrollFormProps, type EnrollFormValues } from './enroll.types';

export { ENROLLABLE_STAGES, blankEnrollValues, enrollSchema, toLeadFilter } from './enroll.types';

/** Which leads from the pipeline join the sequence, with how many that is right now. */
export default function EnrollForm({ sequence, busy, count, countFailed, onFilterChange, onSubmit, onCancel }: Readonly<EnrollFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => enrollSchema(t), [t]);
  const { control, handleSubmit } = useForm<EnrollFormValues, unknown, EnrollFormValues>({
    defaultValues: blankEnrollValues(sequence),
    resolver: zodResolver(schema) as unknown as Resolver<EnrollFormValues, unknown, EnrollFormValues>,
    mode: 'onChange',
  });
  const [pipeline, stage, city] = useWatch({ control, name: ['pipeline', 'stage', 'city'] });

  useEffect(() => {
    onFilterChange(toLeadFilter({ pipeline, stage, city }));
  }, [pipeline, stage, city, onFilterChange]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form noValidate onSubmit={submit} aria-label={t('marketing.outreach.enrollFormLabel')} data-testid="enroll-form">
      <Stack spacing={2} sx={{ pt: 1 }}>
        <RhfTextField
          control={control}
          name="pipeline"
          select
          label={t('marketing.outreach.pipeline')}
          hint={sequence.pipeline ? t('marketing.outreach.pipelineLocked') : undefined}
          disabled={busy || sequence.pipeline !== null}
          fullWidth
        >
          <MenuItem value="">{t('marketing.outreach.anyPipeline')}</MenuItem>
          {PIPELINES.map((value) => (
            <MenuItem key={value} value={value}>
              {t(PIPELINE_LABEL[value])}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="stage" select label={t('marketing.outreach.stage')} hint={t('marketing.outreach.stageHint')} disabled={busy} fullWidth>
          <MenuItem value="">{t('marketing.outreach.anyStage')}</MenuItem>
          {ENROLLABLE_STAGES.map((value) => (
            <MenuItem key={value} value={value}>
              {t(STAGE_LABEL[value])}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="city" label={t('marketing.outreach.city')} hint={t('marketing.outreach.cityHint')} disabled={busy} fullWidth />
        {!countFailed && (
          <Alert severity={count === 0 ? 'warning' : 'info'} role="status" data-testid="enroll-count">
            {count === null ? t('marketing.outreach.counting') : t('marketing.outreach.enrollCount', { vars: { count: String(count) } })}
          </Alert>
        )}
      </Stack>
      <DialogActions sx={{ px: 0, pb: 0 }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={busy} disabled={!count} data-testid="enroll-submit">
          {t('marketing.outreach.enrollSubmit')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
