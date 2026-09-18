import { Controller } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, Stack, TextField } from '@mui/material';
import { useConfirm } from '@duncit/dialogs';
import FormDialog from '../../../../components/FormDialog';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import RhfRefundMode from '../../../../components/form/RhfRefundMode';
import type { RefundMode } from '../../../../lib/status';
import { STORE_CANCEL_REASONS } from '../../queries';
import { makeOrderCancelSchema, ORDER_CANCEL_DEFAULTS, type OrderCancelValues } from './order-cancel.types';

interface OrderCancelFormProps {
  orderNo: string;
  /** A guest has no Duncit Coins balance, so coins are not offered. */
  isGuest: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string, refundMode: RefundMode) => Promise<boolean>;
}

/**
 * Call an order off: why (a stored reason, or one typed here), and how any money
 * goes back. Confirmed once more before it runs — the courier, the stock and the
 * refund all move with it.
 */
export default function OrderCancelForm({ orderNo, isGuest, busy, onClose, onSubmit }: Readonly<OrderCancelFormProps>) {
  const { t, form } = useSchemaForm<OrderCancelValues>(makeOrderCancelSchema, ORDER_CANCEL_DEFAULTS);
  const { control, handleSubmit } = form;
  const confirm = useConfirm();
  const reasons = useQuery(STORE_CANCEL_REASONS, { fetchPolicy: 'cache-first' }).data?.storeAdminSettings.cancel_reasons ?? [];

  const submit = handleSubmit(async (values) => {
    const ok = await confirm({
      title: t('ecommPortal.orders.cancelConfirmTitle', { vars: { order: orderNo } }),
      message: t('ecommPortal.orders.cancelConfirmMessage'),
      destructive: true,
      confirmLabel: t('ecommPortal.orders.cancelOrder'),
      cancelLabel: t('ecommPortal.orders.keepOrder'),
    });
    if (ok && (await onSubmit(values.reason, values.refund_mode))) onClose();
  });

  return (
    <FormDialog formId="order-cancel-form" title={t('ecommPortal.orders.cancelTitle', { vars: { order: orderNo } })} busy={busy} onClose={onClose} onSubmit={submit} submitLabel={t('ecommPortal.orders.cancelOrder')}>
      <Stack spacing={2}>
        <Controller
          control={control}
          name="reason"
          render={({ field, fieldState }) => (
            <Autocomplete
              freeSolo
              options={reasons}
              inputValue={field.value}
              onInputChange={(_event, value) => field.onChange(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  onBlur={field.onBlur}
                  label={t('ecommPortal.orders.cancelReason')}
                  required
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message ?? t('ecommPortal.orders.cancelReasonHint')}
                />
              )}
            />
          )}
        />
        <RhfRefundMode control={control} name="refund_mode" isGuest={isGuest} />
      </Stack>
    </FormDialog>
  );
}
