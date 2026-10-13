import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  foodOrderCancelDefaults,
  makeFoodOrderCancelSchema,
  type FoodOrderCancelValues,
} from './food-order-cancel.types';

interface Props {
  /** What cancelling does, with the guest and the amount going back — read before the reason is typed. */
  consequence: string;
  busy: boolean;
  /** The server's refusal, kept in the dialog so the reason is not lost. */
  apiError?: string | null;
  onSubmit: (values: FoodOrderCancelValues) => void;
  onCancel: () => void;
}

/** Call a paid food order off with a full refund — the reason is required, the guest is told it. */
export default function FoodOrderCancelForm({ consequence, busy, apiError = null, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFoodOrderCancelSchema(t), [t]);
  const { control, handleSubmit } = useForm<FoodOrderCancelValues>({
    resolver: zodResolver(schema),
    defaultValues: foodOrderCancelDefaults,
    mode: 'onBlur',
  });

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)} noValidate data-testid="food-order-cancel-form">
      <Alert severity="warning">{consequence}</Alert>
      {apiError && <Alert severity="error">{apiError}</Alert>}
      <RhfTextField
        control={control}
        name="reason"
        label={t('partners.foodOrders.cancelReason')}
        hint={t('partners.foodOrders.cancelReasonHint')}
        required
        multiline
        minRows={2}
        data-testid="food-order-cancel-reason"
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('partners.foodOrders.cancelKeep')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" color="error" loading={busy} data-testid="food-order-cancel-confirm">
          {t('partners.foodOrders.cancelConfirm')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
