import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { formatTime, useTranslation } from '@duncit/app-settings';
import RefundTierRow from './RefundTierRow';
import { emptyRefundTier, makeCancellationTriggerSchema, toTriggerValues } from './cancellation-trigger.schema';
import type {
  CancellationTriggerValues,
  SubmitCancellationTrigger,
  VenueCancellationTrigger,
} from './cancellation-trigger.types';

export interface CancellationTriggerFormProps {
  /** The venue's stored trigger + ladder. Undefined edits the defaults. */
  trigger?: Partial<VenueCancellationTrigger> | null;
  saving: boolean;
  onSubmit: SubmitCancellationTrigger;
}

/** The evening slot the worked example is written around. Only ever printed. */
const EXAMPLE_START_HOUR = 19;

const exampleTimes = (hours: number) => {
  const start = new Date();
  start.setHours(EXAMPLE_START_HOUR, 0, 0, 0);
  const deadline = new Date(start.getTime() - hours * 60 * 60 * 1000);
  return { start: formatTime(start), deadline: formatTime(deadline) };
};

/**
 * The venue's cancellation trigger: how close to the start a loss-making pod
 * here may still be auto-cancelled, and what everyone enrolled gets back when
 * it fires. Sits under Venue deductions in the review because it is the other
 * half of the same question — what this venue costs Duncit when a pod is thin.
 */
export default function CancellationTriggerForm({
  trigger,
  saving,
  onSubmit,
}: Readonly<CancellationTriggerFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeCancellationTriggerSchema(t), [t]);
  const initialValues = useMemo(() => toTriggerValues(trigger), [trigger]);
  const { control, handleSubmit, reset } = useForm<
    CancellationTriggerValues,
    any,
    CancellationTriggerValues
  >({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as unknown as Resolver<
      CancellationTriggerValues,
      any,
      CancellationTriggerValues
    >,
    mode: 'onTouched',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'refund_tiers' });
  const triggerHours = useWatch({ control, name: 'trigger_hours' });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const example = exampleTimes(Number(triggerHours) || 0);
  const submit = handleSubmit((values) =>
    onSubmit({
      trigger_hours: Number(values.trigger_hours),
      refund_tiers: values.refund_tiers.map((tier) => ({
        hours_before: Number(tier.hours_before),
        refund_pct: Number(tier.refund_pct),
      })),
    })
  );

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {t('onboarding.venues.cancellationTrigger')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {t('onboarding.venues.cancellationTriggerHint')}
      </Typography>

      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        <Controller
          control={control}
          name="trigger_hours"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('onboarding.venues.triggerHours')}
              type="number"
              size="small"
              fullWidth
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {t('onboarding.venues.hours')}
                    </InputAdornment>
                  ),
                },
                htmlInput: { min: 0, max: 8760, step: 1 },
              }}
            />
          )}
        />
        <Alert severity="info" sx={{ py: 0.25 }}>
          <Typography variant="caption">
            {t('onboarding.venues.cancellationTriggerExample', {
              vars: { hours: triggerHours, start: example.start, deadline: example.deadline },
            })}
          </Typography>
        </Alert>

        <Stack spacing={0.25}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('onboarding.venues.refundBands')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('onboarding.venues.refundBandsHint')}
          </Typography>
        </Stack>

        {fields.length === 0 && (
          <Alert severity="success" sx={{ py: 0.25 }}>
            <Typography variant="caption">{t('onboarding.venues.noRefundBands')}</Typography>
          </Alert>
        )}

        {fields.map((row, index) => (
          <RefundTierRow
            key={row.id}
            control={control}
            index={index}
            onRemove={() => remove(index)}
            t={t}
          />
        ))}

        <Stack direction="row" spacing={1.5}>
          <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append(emptyRefundTier)}>
            {t('onboarding.venues.addRefundBand')}
          </DuncitButton>
          <DuncitButton variant="outlined" size="small" onClick={submit} loading={saving}>
            {t('onboarding.venues.saveCancellationTrigger')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
