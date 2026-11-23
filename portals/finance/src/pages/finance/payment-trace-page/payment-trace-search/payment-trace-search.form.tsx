import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { TRACE_REF_MAX, paymentTraceSearchSchema } from './payment-trace-search.schema';
import type { PaymentTraceSearchProps, PaymentTraceSearchValues } from './payment-trace-search.types';

/**
 * The one field of Payment Trace: paste any id a payment goes by. Submitting
 * hands the trimmed id up, and the page puts it in the address bar, so a trace
 * can be bookmarked or shared and Back returns to the previous one.
 */
export default function PaymentTraceSearchForm({ initialRef, busy, onSubmit }: Readonly<PaymentTraceSearchProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<PaymentTraceSearchValues>({
    defaultValues: { ref: initialRef },
    resolver: zodResolver(paymentTraceSearchSchema(t)),
  });

  // Following a link to another id (or pressing Back) shows that id in the field.
  useEffect(() => {
    reset({ ref: initialRef });
  }, [initialRef, reset]);

  return (
    <form noValidate role="search" onSubmit={handleSubmit((values) => onSubmit(values.ref))}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <Controller
          control={control}
          name="ref"
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={t('finance.paymentTrace.refLabel')}
              placeholder={t('finance.paymentTrace.refPlaceholder')}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? t('finance.paymentTrace.refHint')}
              slotProps={{ htmlInput: { maxLength: TRACE_REF_MAX, spellCheck: false, autoComplete: 'off' } }}
              fullWidth
            />
          )}
        />
        <DuncitButton type="submit" variant="contained" startIcon={<SearchIcon />} loading={busy} sx={{ flexShrink: 0, mt: { sm: 1 } }}>
          {t('finance.paymentTrace.submit')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
