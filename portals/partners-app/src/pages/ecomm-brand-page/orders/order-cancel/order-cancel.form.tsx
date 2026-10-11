import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { makeOrderCancelSchema, orderCancelDefaults, type OrderCancelValues } from './order-cancel.types';

interface Props {
  /** What cancelling does, with the buyer and the amount going back — read before the reason is typed. */
  consequence: string;
  busy: boolean;
  onSubmit: (values: OrderCancelValues) => void;
  onCancel: () => void;
}

/** Call an own-brand order off with a full refund — the reason is required, the buyer is told it. */
export default function OrderCancelForm({ consequence, busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeOrderCancelSchema(t), [t]);
  const { control, handleSubmit } = useForm<OrderCancelValues>({
    resolver: zodResolver(schema),
    defaultValues: orderCancelDefaults,
    mode: 'onBlur',
  });

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)} noValidate data-testid="order-cancel-form">
      <Alert severity="warning">{consequence}</Alert>
      <RhfTextField
        control={control}
        name="reason"
        label={t('partners.orders.cancelReason')}
        hint={t('partners.orders.cancelReasonHint')}
        required
        multiline
        minRows={2}
        data-testid="order-cancel-reason"
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('partners.orders.cancelKeep')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" color="error" loading={busy} data-testid="order-cancel-confirm">
          {t('partners.orders.cancelConfirm')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
