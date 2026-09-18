import { useWatch } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { statusLabel } from '@duncit/utils';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import { SETTABLE_ORDER_STATUSES } from '../../../../lib/status';
import { makeOrderStatusSchema, toOrderStatusValues, type OrderStatusValues } from './order-status.types';

interface OrderStatusFormProps {
  current: string;
  busy: boolean;
  onSubmit: (status: string, note: string) => Promise<boolean>;
}

/** Move an order along by hand, with an optional note the buyer's update email carries. */
export default function OrderStatusForm({ current, busy, onSubmit }: Readonly<OrderStatusFormProps>) {
  const { t, form } = useSchemaForm<OrderStatusValues>(makeOrderStatusSchema, toOrderStatusValues(current));
  const { control, handleSubmit, reset } = form;
  const status = useWatch({ control, name: 'status' });
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values.status, values.note)) reset({ status: values.status, note: '' });
  });
  return (
    <form noValidate onSubmit={submit} aria-label={t('ecommPortal.orders.updateStatus')}>
      <Stack spacing={1}>
        <RhfTextField control={control} name="status" label={t('ecommPortal.orders.setStatus')} select size="small">
          {SETTABLE_ORDER_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {statusLabel(value, t)}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="note" label={t('ecommPortal.orders.note')} size="small" hint={t('ecommPortal.orders.noteHint')} />
        <DuncitButton type="submit" variant="contained" loading={busy} disabled={status === current}>
          {t('ecommPortal.orders.updateStatus')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
