import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parseISO } from 'date-fns';
import { Alert, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import DateField from '../../../components/DateField';
import {
  DELETION_REASON_MAX,
  makeDeletionRequestSchema,
  type DeletionRequestValues,
} from './deletion-request.types';

interface Props {
  earliest: string;
  latest: string;
  defaultValues: DeletionRequestValues;
  busy: boolean;
  apiError?: string | null;
  onSubmit: (values: DeletionRequestValues) => void;
  onCancel: () => void;
}

/** One choice with its plain-language consequence underneath. */
function ModeLabel({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <Stack spacing={0.25} sx={{ py: 0.75 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {body}
      </Typography>
    </Stack>
  );
}

/** What happens to running orders, the deletion day and an optional reason. */
export default function DeletionRequestForm({ earliest, latest, defaultValues, busy, apiError = null, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeDeletionRequestSchema(t, earliest, latest), [t, earliest, latest]);
  const { control, handleSubmit } = useForm<DeletionRequestValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });
  const windowHint = t('partners.deletionRequest.dateHint', {
    vars: { earliest: formatDate(earliest), latest: formatDate(latest) },
  });

  return (
    <Stack spacing={2.25} component="form" onSubmit={handleSubmit(onSubmit)} noValidate data-testid="deletion-request-form">
      {apiError && <Alert severity="error">{apiError}</Alert>}
      <Controller
        control={control}
        name="mode"
        render={({ field }) => (
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 700, mb: 0.5 }}>
              {t('partners.deletionRequest.modeLegend')}
            </FormLabel>
            <RadioGroup name={field.name} value={field.value} onChange={(_, value) => field.onChange(value)}>
              <FormControlLabel
                value="WAIT_FOR_ORDERS"
                control={<Radio />}
                data-testid="deletion-mode-wait"
                label={<ModeLabel title={t('partners.deletionRequest.modeWaitTitle')} body={t('partners.deletionRequest.modeWaitBody')} />}
              />
              <FormControlLabel
                value="CANCEL_AND_REFUND"
                control={<Radio />}
                data-testid="deletion-mode-cancel"
                label={<ModeLabel title={t('partners.deletionRequest.modeCancelTitle')} body={t('partners.deletionRequest.modeCancelBody')} />}
              />
            </RadioGroup>
          </FormControl>
        )}
      />
      <Controller
        control={control}
        name="scheduled_for"
        render={({ field, fieldState }) => (
          <DateField
            label={t('partners.deletionRequest.dateLabel')}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            minDate={parseISO(earliest)}
            maxDate={parseISO(latest)}
            required
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? windowHint}
          />
        )}
      />
      <RhfTextField
        control={control}
        name="reason"
        label={t('partners.deletionRequest.reasonLabel')}
        hint={t('partners.deletionRequest.reasonHint')}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: DELETION_REASON_MAX } }}
        data-testid="deletion-request-reason"
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" color="error" loading={busy} data-testid="deletion-request-submit">
          {t('partners.deletionRequest.submit')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
