import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { foodOrderCancelledMessage, foodOrderMoney, type FoodOwnerOrder } from '@duncit/utils';
import {
  foodOrderCancelDefaults,
  makeFoodOrderCancelSchema,
  type FoodOrderCancelValues,
} from '@duncit/forms/schemas';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { cancelFoodOrder } from '@/services/venue-food-owner';
import { toErrorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  /** The order being called off; null closes the sheet. */
  order: FoodOwnerOrder | null;
  onClose: () => void;
  /** The server's copy after the cancel, and the line saying where the refund is. */
  onCancelled: (order: FoodOwnerOrder, message: string) => void;
}

function CancelForm({ order, onClose, onCancelled }: Readonly<Props & { order: FoodOwnerOrder }>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => makeFoodOrderCancelSchema(t), [t]);
  const { control, handleSubmit } = useForm<FoodOrderCancelValues, any, FoodOrderCancelValues>({
    resolver: formResolver<FoodOrderCancelValues>(schema),
    defaultValues: foodOrderCancelDefaults,
  });

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      const cancelled = await cancelFoodOrder(order.id, values.reason.trim());
      onCancelled(cancelled, foodOrderCancelledMessage(t, cancelled));
    } catch (e) {
      // The refusal stays in the sheet with the typed reason.
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  const footer = (
    <ConfirmFooter
      cancelLabel={t('venueFoodOwner.orders.cancelKeep')}
      confirmLabel={t('venueFoodOwner.orders.cancelConfirm')}
      busy={busy}
      destructive
      cancelTestID="food-order-cancel-keep"
      confirmTestID="food-order-cancel-confirm"
      onCancel={onClose}
      onConfirm={() => {
        submit().catch((e: unknown) => setError(toErrorMessage(e)));
      }}
    />
  );

  return (
    <DuncitDialog
      open
      onClose={busy ? () => undefined : onClose}
      testID="food-order-cancel"
      title={t('venueFoodOwner.orders.cancelTitle', { vars: { no: order.order_no } })}
      closeLabel={t('venueFoodOwner.orders.cancelKeep')}
      variant="center"
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={footer}
    >
      <YStack gap={12}>
        <Text fontSize={13.5} fontWeight="600" color="$warning">
          {t('venueFoodOwner.orders.cancelBody', {
            vars: { guest: order.customer_name, amount: foodOrderMoney(order, order.total) },
          })}
        </Text>
        <FormTextField
          control={control}
          name="reason"
          label={t('venueFoodOwner.orders.cancelReason')}
          hint={t('venueFoodOwner.orders.cancelReasonHint')}
          multiline
          required
        />
        {error ? (
          <Text role="alert" testID="food-order-cancel-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}

/**
 * Cancel a paid food order with a full refund — the reason is required, the
 * guest is told it. The rule is @duncit/forms' (the web dialog binds the same
 * one); keyed on the order so reopening starts from a clean form.
 */
export function FoodOrderCancelSheet({ order, ...rest }: Readonly<Props>) {
  return order ? <CancelForm key={order.id} order={order} {...rest} /> : null;
}
