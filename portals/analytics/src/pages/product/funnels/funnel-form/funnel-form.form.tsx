import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import StepRow from './StepRow';
import { MAX_STEPS, MAX_WINDOW_DAYS, MIN_STEPS, funnelSchema, type FunnelValues } from './funnel-form.types';

interface Props {
  defaultValues: FunnelValues;
  events: readonly string[];
  screens: readonly string[];
  busy: boolean;
  onSubmit: (values: FunnelValues) => void;
}

/** The funnel's steps in order, and how long a person has to finish it. */
export default function FunnelForm({ defaultValues, events, screens, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm<FunnelValues>({
    defaultValues,
    resolver: zodResolver(
      funnelSchema({
        valueRequired: t('analytics.product.funnels.valueRequired'),
        tooFewSteps: t('analytics.product.funnels.tooFewSteps', { vars: { min: MIN_STEPS } }),
        tooManySteps: t('analytics.product.funnels.tooManySteps', { vars: { max: MAX_STEPS } }),
        windowRange: t('analytics.product.funnels.windowRange', { vars: { max: MAX_WINDOW_DAYS } }),
      })
    ),
    mode: 'all',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });
  const stepsError = formState.errors.steps?.root?.message ?? formState.errors.steps?.message;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="funnel-form">
      <Stack spacing={1.5}>
        {fields.map((field, index) => (
          <StepRow
            key={field.id}
            index={index}
            control={control}
            events={events}
            screens={screens}
            canRemove={fields.length > MIN_STEPS}
            onRemove={() => remove(index)}
          />
        ))}
        {stepsError && <Alert severity="error">{stepsError}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          <DuncitButton
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={fields.length >= MAX_STEPS}
            onClick={() => append({ kind: 'SCREEN', value: '' })}
          >
            {t('analytics.product.funnels.addStep')}
          </DuncitButton>
          <Controller
            control={control}
            name="window_days"
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                type="number"
                size="small"
                label={t('analytics.product.funnels.windowDays')}
                // An empty box is NaN, which the schema reports, rather than a silent 0.
                onChange={(event) => field.onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}
                value={Number.isNaN(field.value) ? '' : field.value}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                sx={{ width: 200 }}
                slotProps={{ htmlInput: { min: 1, max: MAX_WINDOW_DAYS, 'data-testid': 'funnel-window' } }}
              />
            )}
          />
          <DuncitButton type="submit" loading={busy} data-testid="funnel-run">
            {t('analytics.product.funnels.run')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
