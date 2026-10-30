import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { leadSettingsSchema, settingsValues, type LeadSettingsFormProps, type LeadSettingsFormValues } from './lead-settings.types';

/** How many follow-ups, how far apart, the daily cap, and what every DM offers. */
export default function LeadSettingsForm({ settings, onSubmit }: Readonly<LeadSettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => leadSettingsSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<LeadSettingsFormValues, unknown, LeadSettingsFormValues>({
    defaultValues: settingsValues(settings),
    resolver: zodResolver(schema) as unknown as Resolver<LeadSettingsFormValues, unknown, LeadSettingsFormValues>,
    mode: 'onChange',
  });

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} data-testid="ig-lead-settings-form">
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <RhfTextField
              control={control}
              name="max_follow_ups"
              label={t('marketing.igLeads.maxFollowUps')}
              hint={t('marketing.igLeads.maxFollowUpsHint')}
              type="number"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <RhfTextField
              control={control}
              name="follow_up_gap_days"
              label={t('marketing.igLeads.gapDays')}
              hint={t('marketing.igLeads.gapDaysHint')}
              type="number"
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <RhfTextField
              control={control}
              name="daily_send_limit"
              label={t('marketing.igLeads.dailyLimit')}
              hint={t('marketing.igLeads.dailyLimitHint')}
              type="number"
              required
            />
          </Grid>
        </Grid>
        <RhfTextField
          control={control}
          name="pitch"
          label={t('marketing.igLeads.pitch')}
          hint={t('marketing.igLeads.pitchHint')}
          multiline
          minRows={3}
          required
        />
        <Stack direction="row">
          <DuncitButton
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formState.isDirty}
            onClick={() => handleSubmit(onSubmit)()}
            data-testid="ig-lead-settings-save"
          >
            {t('marketing.igLeads.saveSettings')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
