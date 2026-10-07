import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DuncitButton } from '@duncit/buttons';
import { POD_REQUEST_LIMIT_MAX, makePodRequestLimitSchema } from '@duncit/forms/schemas';
import { useTranslation } from '@duncit/shell';
import type { RequestLimitFormProps, RequestLimitFormValues, RequestLimitValues } from './request-limit.types';

/**
 * One whole number, 0–100: how many Pod Requests this partner may send a
 * month. An admin override, when set, is said above the box — it is the number
 * the server actually counts against.
 */
export default function RequestLimitForm({ label, limit, override, saving, error, onSave }: Readonly<RequestLimitFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePodRequestLimitSchema(t), [t]);
  const values = useMemo<RequestLimitFormValues>(() => ({ limit: String(limit) }), [limit]);
  // The box holds text and the schema hands back a number: the third generic
  // pins the submitted shape, as the console's other numeric forms do.
  const form = useForm<RequestLimitFormValues, unknown, RequestLimitValues>({
    resolver: zodResolver(schema) as unknown as Resolver<RequestLimitFormValues, unknown, RequestLimitValues>,
    values,
    mode: 'onTouched',
  });
  const submit = form.handleSubmit((parsed) => onSave(parsed.limit));

  return (
    <Stack component="form" noValidate spacing={1.5} onSubmit={submit}>
      {typeof override === 'number' && (
        <Alert severity="info">{t('podRequests.limitOverridden', { vars: { limit: override } })}</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <Controller
          name="limit"
          control={form.control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              type="number"
              size="small"
              label={label}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? t('podRequests.limitHint')}
              slotProps={{ htmlInput: { min: 0, max: POD_REQUEST_LIMIT_MAX, step: 1, inputMode: 'numeric' } }}
              sx={{ minWidth: 260 }}
            />
          )}
        />
        <DuncitButton type="submit" variant="contained" disabled={saving}>
          {t('podRequests.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
