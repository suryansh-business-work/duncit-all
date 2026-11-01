import { Controller, useFormContext } from 'react-hook-form';
import { FormControlLabel, Grid, MenuItem, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { HOURS } from '../../agents-page/copy';
import { PIPELINES, PIPELINE_LABEL } from '../../leads-page/copy';
import type { SequenceFormValues } from './sequence.types';

/** The sequence's own fields: its name, the leads it takes, its daily pace and its quiet hours. */
export default function SequenceSettingsFields({ disabled }: Readonly<{ disabled: boolean }>) {
  const { t } = useTranslation();
  const { control } = useFormContext<SequenceFormValues>();

  const hourSelect = (name: 'quiet_start_hour' | 'quiet_end_hour', label: string, hint: string) => (
    <RhfTextField control={control} name={name} select label={label} hint={hint} disabled={disabled} fullWidth data-testid={`sequence-${name}`}>
      {HOURS.map((hour) => (
        <MenuItem key={hour} value={hour}>
          {t('marketing.outreach.hourOption', { vars: { hour: String(hour).padStart(2, '0') } })}
        </MenuItem>
      ))}
    </RhfTextField>
  );

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RhfTextField control={control} name="name" label={t('marketing.outreach.name')} disabled={disabled} fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RhfTextField control={control} name="pipeline" select label={t('marketing.outreach.pipeline')} hint={t('marketing.outreach.pipelineHint')} disabled={disabled} fullWidth>
          <MenuItem value="">{t('marketing.outreach.anyPipeline')}</MenuItem>
          {PIPELINES.map((pipeline) => (
            <MenuItem key={pipeline} value={pipeline}>
              {t(PIPELINE_LABEL[pipeline])}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={12}>
        <RhfTextField control={control} name="description" label={t('marketing.outreach.description')} disabled={disabled} fullWidth multiline minRows={2} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <RhfTextField
          control={control}
          name="daily_limit"
          type="number"
          label={t('marketing.outreach.dailyLimit')}
          hint={t('marketing.outreach.dailyLimitHint')}
          disabled={disabled}
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>{hourSelect('quiet_start_hour', t('marketing.outreach.quietStart'), t('marketing.outreach.quietHint'))}</Grid>
      <Grid size={{ xs: 12, sm: 4 }}>{hourSelect('quiet_end_hour', t('marketing.outreach.quietEnd'), t('marketing.outreach.quietEndHint'))}</Grid>
      <Grid size={12}>
        <Controller
          control={control}
          name="stop_on_reply"
          render={({ field }) => (
            <FormControlLabel
              label={t('marketing.outreach.stopOnReply')}
              control={
                <Switch
                  checked={field.value}
                  disabled={disabled}
                  onChange={(event) => field.onChange(event.target.checked)}
                  data-testid="sequence-stop-on-reply"
                />
              }
            />
          )}
        />
      </Grid>
    </Grid>
  );
}
