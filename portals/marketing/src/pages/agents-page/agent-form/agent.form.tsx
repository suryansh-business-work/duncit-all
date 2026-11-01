import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, FormControl, FormControlLabel, FormGroup, FormHelperText, FormLabel, Grid, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { FormActionsRow, HelpTip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { PLATFORMS, PLATFORM_LABEL } from '../../social-accounts-page/copy';
import { CADENCES, CADENCE_LABEL, HOURS, WEEKDAYS, WEEKDAY_LABEL } from '../copy';
import { MAX_POSTS_PER_WEEK, agentFormSchema, toFormValues, type AgentFormOutput, type AgentFormProps, type AgentFormValues } from './agent.types';

export { MAX_BRIEF, MAX_POSTS_PER_WEEK, agentFormSchema, toFormValues, toUpdateInput } from './agent.types';

/** When an agent runs and, for one that reads them, what it is told. */
export default function AgentForm({ agent, readOnly, busy, onSubmit }: Readonly<AgentFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState, reset, watch } = useForm<AgentFormValues, unknown, AgentFormOutput>({
    defaultValues: toFormValues(agent),
    resolver: zodResolver(agentFormSchema(t)) as Resolver<AgentFormValues, unknown, AgentFormOutput>,
    mode: 'onChange',
  });
  // Read both now: react-hook-form only tracks a formState flag that was read while rendering, and `!isValid || …` would skip isDirty until validation lands.
  const { isValid, isDirty } = formState;
  const weekly = watch('every') === 'WEEK';

  // What the server last answered — after a save, or a toggle elsewhere on the card — is the baseline, not a pending edit.
  useEffect(() => {
    reset(toFormValues(agent));
  }, [agent, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit} aria-label={t('marketing.agents.formLabel')} data-testid={`agent-form-${agent.key}`}>
      <Grid container spacing={2}>
        <Grid size={12} data-tour="agent-schedule">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <RhfTextField control={control} name="every" select label={t('marketing.agents.every')} disabled={readOnly || busy} hint={t('marketing.agents.everyHint')} data-testid="agent-every">
                {CADENCES.map((cadence) => (
                  <MenuItem key={cadence} value={cadence}>
                    {t(CADENCE_LABEL[cadence])}
                  </MenuItem>
                ))}
              </RhfTextField>
            </Grid>
            {weekly && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <RhfTextField control={control} name="weekday" select label={t('marketing.agents.weekday')} disabled={readOnly || busy} hint={t('marketing.agents.weekdayHint')} data-testid="agent-weekday">
                  {WEEKDAYS.map((day) => (
                    <MenuItem key={day} value={day}>
                      {t(WEEKDAY_LABEL[day])}
                    </MenuItem>
                  ))}
                </RhfTextField>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 4 }}>
              <RhfTextField control={control} name="hour" select label={t('marketing.agents.hour')} disabled={readOnly || busy} hint={t('marketing.agents.hourHint')} data-testid="agent-hour">
                {HOURS.map((hour) => (
                  <MenuItem key={hour} value={hour}>
                    {t('marketing.agents.hourOption', { vars: { hour: String(hour).padStart(2, '0') } })}
                  </MenuItem>
                ))}
              </RhfTextField>
            </Grid>
          </Grid>
        </Grid>

        {agent.has_params && (
          <>
            <Grid size={12}>
              <RhfTextField control={control} name="brief" label={t('marketing.agents.brief')} multiline minRows={2} disabled={readOnly || busy} hint={t('marketing.agents.briefHint')} data-testid="agent-brief" />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Controller
                control={control}
                name="networks"
                render={({ field }) => (
                  <FormControl component="fieldset" disabled={readOnly || busy} data-testid="agent-networks">
                    <FormLabel component="legend">
                      {t('marketing.agents.networks')}
                      <HelpTip title={t('marketing.agents.networksHint')} />
                    </FormLabel>
                    <FormGroup row>
                      {PLATFORMS.map((platform) => (
                        <FormControlLabel
                          key={platform}
                          label={t(PLATFORM_LABEL[platform])}
                          control={
                            <Checkbox
                              checked={field.value.includes(platform)}
                              onBlur={field.onBlur}
                              onChange={(event) =>
                                field.onChange(event.target.checked ? [...field.value, platform] : field.value.filter((p) => p !== platform))
                              }
                            />
                          }
                        />
                      ))}
                    </FormGroup>
                    <FormHelperText>{t('marketing.agents.networksHint')}</FormHelperText>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <RhfTextField
                control={control}
                name="posts_per_week"
                type="number"
                label={t('marketing.agents.postsPerWeek')}
                disabled={readOnly || busy}
                hint={t('marketing.agents.postsPerWeekHint', { vars: { max: String(MAX_POSTS_PER_WEEK) } })}
                slotProps={{ htmlInput: { min: 1, max: MAX_POSTS_PER_WEEK, step: 1 } }}
                data-testid="agent-posts-per-week"
              />
            </Grid>
          </>
        )}

        {readOnly ? null : (
          <FormActionsRow busy={busy} disabled={!isValid || !isDirty} submitLabel={t('marketing.agents.save')} />
        )}
      </Grid>
    </form>
  );
}
