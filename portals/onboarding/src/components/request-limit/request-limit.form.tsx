import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Paper, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { POD_REQUEST_OVERRIDE_MAX, makePodRequestOverrideSchema } from '@duncit/forms/schemas';
import { parseApiError } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';
import type { RequestLimitFormProps, RequestLimitInput, RequestLimitValues } from './request-limit.types';

const toText = (limit: number | null | undefined) => (typeof limit === 'number' ? String(limit) : '');

/**
 * The monthly Pod Request limit of a venue or a host — admin-only: partners
 * never see or change it. Empty means "not set", so the default of 10 applies;
 * the rule is the shared `makePodRequestOverrideSchema`, the same one the
 * Venues / Hosts portal editors use.
 *
 * Not a <form>: the Edit dialogs already wrap their body in one, and this saves
 * on its own button, so Enter in the box is caught here instead of submitting
 * the dialog around it.
 */
export default function RequestLimitForm({ label, limit, saving, onSave, testId }: Readonly<RequestLimitFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePodRequestOverrideSchema(t), [t]);
  const [saved, setSaved] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty, errors },
  } = useForm<RequestLimitInput, unknown, RequestLimitValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { limit: toText(limit) },
  });

  // Another record opened, or the stored value refreshed: show what is stored.
  useEffect(() => {
    reset({ limit: toText(limit) });
  }, [limit, reset]);

  const submit = handleSubmit(async (values) => {
    setSaved(false);
    try {
      await onSave(values.limit);
      reset({ limit: toText(values.limit) });
      setSaved(true);
    } catch (err) {
      setError('root', { message: parseApiError(err) });
    }
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    fireAndForget(submit(), logs.portal.onboarding, 'RequestLimitForm', 'submit');
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid={testId}>
      <Stack spacing={1.5}>
        {errors.root?.message && (
          <Alert severity="error" data-testid={`${testId}-error`}>
            {errors.root.message}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
          <Controller
            control={control}
            name="limit"
            render={({ field, fieldState }) => (
              <TextField
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                onKeyDown={onKeyDown}
                type="number"
                size="small"
                label={label}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? t('podRequests.overrideHint')}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    max: POD_REQUEST_OVERRIDE_MAX,
                    step: 1,
                    inputMode: 'numeric',
                    'data-testid': `${testId}-input`,
                  },
                }}
                sx={{ minWidth: 260 }}
              />
            )}
          />
          <DuncitButton
            type="button"
            variant="outlined"
            onClick={() => fireAndForget(submit(), logs.portal.onboarding, 'RequestLimitForm', 'submit')}
            loading={saving}
            disabled={!isDirty}
            data-testid={`${testId}-save`}
          >
            {t('shell.common.save')}
          </DuncitButton>
        </Stack>
        {saved && !isDirty && (
          <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }}>
            {t('shell.common.saved')}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
