import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, Chip, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { buildAskDuncitRolePolicySchema, type AskDuncitRolePolicyFormProps, type AskDuncitRolePolicyValues } from './ask-duncit-role-policy.types';

type PolicyResolver = Resolver<AskDuncitRolePolicyValues, unknown, AskDuncitRolePolicyValues>;
const SWITCHES = ['enabled', 'allow_write', 'approve_all_writes'] as const;
const ALL = '*';

/** One role's capabilities, model, approvals and quotas (RHF + Zod). */
export default function AskDuncitRolePolicyForm({ initialValues, categories, disabled, submitting, onSubmit, onReset }: Readonly<AskDuncitRolePolicyFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildAskDuncitRolePolicySchema(t), [t]);
  const switchLabels = useMemo(
    () => ({ enabled: t('ai.askDuncit.control.roleEnabled'), allow_write: t('ai.askDuncit.control.allowWrite'), approve_all_writes: t('ai.askDuncit.control.approveAll') }),
    [t]
  );
  const { control, handleSubmit, reset, formState } = useForm<AskDuncitRolePolicyValues, unknown, AskDuncitRolePolicyValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as unknown as PolicyResolver,
    mode: 'onChange',
  });
  useEffect(() => reset(initialValues), [initialValues, reset]);

  return (
    <Card component="form" noValidate onSubmit={handleSubmit(onSubmit)} data-testid="ask-duncit-role-policy-form">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
            {SWITCHES.map((name) => (
              <Controller key={name} control={control} name={name} render={({ field }) => <FormControlLabel control={<Switch checked={field.value} disabled={disabled} onChange={(e) => field.onChange(e.target.checked)} />} label={switchLabels[name]} />} />
            ))}
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RhfTextField control={control} name="model" label={t('ai.askDuncit.control.model')} hint={t('ai.askDuncit.control.modelHint')} fullWidth disabled={disabled} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <RhfTextField control={control} name="max_output_tokens" type="number" label={t('ai.askDuncit.control.maxTokens')} fullWidth disabled={disabled} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <RhfTextField control={control} name="messages_per_minute" type="number" label={t('ai.askDuncit.control.perMinute')} fullWidth disabled={disabled} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <RhfTextField control={control} name="messages_per_day" type="number" label={t('ai.askDuncit.control.perDay')} fullWidth disabled={disabled} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <RhfTextField control={control} name="tokens_per_day" type="number" label={t('ai.askDuncit.control.tokensPerDay')} fullWidth disabled={disabled} />
            </Grid>
          </Grid>
          <Controller
            control={control}
            name="allowed_categories"
            render={({ field }) => {
              const toggle = (key: string) => field.onChange(field.value.includes(key) ? field.value.filter((k) => k !== key) : [...field.value, key]);
              return (
                <Stack spacing={0.75}>
                  <Typography id="ask-duncit-categories" variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {t('ai.askDuncit.control.categories')}
                  </Typography>
                  <Stack direction="row" useFlexGap role="group" aria-labelledby="ask-duncit-categories" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    <Chip label={t('ai.askDuncit.control.allCategories')} color={field.value.includes(ALL) ? 'primary' : 'default'} aria-pressed={field.value.includes(ALL)} disabled={disabled} onClick={() => toggle(ALL)} />
                    {categories.map((c) => (
                      <Chip key={c.key} label={c.label} color={field.value.includes(c.key) ? 'primary' : 'default'} aria-pressed={field.value.includes(c.key)} disabled={disabled} onClick={() => toggle(c.key)} />
                    ))}
                  </Stack>
                </Stack>
              );
            }}
          />
          <RhfTextField control={control} name="instructions" label={t('ai.askDuncit.control.instructions')} hint={t('ai.askDuncit.control.instructionsHint')} multiline minRows={3} fullWidth disabled={disabled} />
          {!disabled && (
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <DuncitButton onClick={onReset} disabled={submitting}>
                {t('ai.askDuncit.control.reset')}
              </DuncitButton>
              <DuncitButton type="submit" variant="contained" disabled={submitting || !formState.isDirty || !formState.isValid}>
                {t('ai.askDuncit.save')}
              </DuncitButton>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
