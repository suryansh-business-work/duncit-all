import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import {
  POD_REQUEST_LIMIT_MAX,
  makePodRequestLimitSchema,
  type PodRequestLimitFormProps,
  type PodRequestLimitInput,
  type PodRequestLimitValues,
} from './pod-request-limit.types';

/**
 * How many Pod Requests a venue (per venue) or a host may send each month.
 * When Duncit has set a cap for this partner it is shown above the box — it
 * wins over what is saved here.
 */
export default function PodRequestLimitForm({
  label,
  initialLimit,
  override,
  saving,
  error,
  onSubmit,
  testId,
}: Readonly<PodRequestLimitFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePodRequestLimitSchema(t), [t]);
  const form = useForm<PodRequestLimitInput, unknown, PodRequestLimitValues>({
    defaultValues: { limit: String(initialLimit) },
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  // A refetch (or another venue picked) replaces what the box holds.
  useEffect(() => {
    form.reset({ limit: String(initialLimit) });
  }, [initialLimit, form]);

  const submit = form.handleSubmit((values) => onSubmit(values.limit));

  return (
    <Stack component="form" noValidate spacing={1.5} onSubmit={submit} data-testid={testId}>
      {override !== null && (
        <Alert severity="info" data-testid={`${testId}-override`}>
          {t('podRequests.limitOverridden', { vars: { limit: override } })}
        </Alert>
      )}
      <Controller
        control={form.control}
        name="limit"
        render={({ field, fieldState }) => (
          <TextField
            name={field.name}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            inputRef={field.ref}
            fullWidth
            type="number"
            label={label}
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? t('podRequests.limitHint')}
            slotProps={{ htmlInput: { min: 0, max: POD_REQUEST_LIMIT_MAX, step: 1, inputMode: 'numeric' } }}
            data-testid={`${testId}-input`}
          />
        )}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <DuncitButton
        type="submit"
        variant="contained"
        loading={saving}
        sx={{ alignSelf: 'flex-start' }}
        data-testid={`${testId}-save`}
      >
        {t('podRequests.save')}
      </DuncitButton>
    </Stack>
  );
}
