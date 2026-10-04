import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { parseApiError } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { RequestPodShopReturnDocument } from '@/graphql/pod-shop-returns';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { formResolver } from '@/utils/form-resolver';
import { reasonKey } from '@/utils/pod-shop-returns';
import type { ProductOrder } from '@/utils/product-orders';
import {
  buildReturnSchema,
  COMMENTS_MAX,
  returnFormDefaults,
  toReturnInput,
  type ReturnFormValues,
} from './pod-shop-return.form';
import { ReturnQtyStepper } from './ReturnQtyStepper';
import { ReturnReasonList } from './ReturnReasonList';

interface Props {
  /** The order being returned from; null keeps the sheet closed. */
  order: ProductOrder | null;
  onClose: () => void;
  /** The return landed — the screen says so and reloads orders and returns. */
  onRequested: () => void;
}

const EMPTY: ReturnFormValues = { lines: [], reason: '', comments: '' };

/**
 * "Return items" (RHF + Zod + Tamagui): a stepper per line that can still go
 * back, one reason, optional comments. mWeb twin: PodShopReturnDialog +
 * forms/pod-shop-return (rule 27).
 */
export function PodShopReturnSheet({ order, onClose, onRequested }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const schema = useMemo(
    () =>
      buildReturnSchema({
        pickItem: t('mweb.podShopReturns.errorPickItem'),
        qtyTooHigh: t('mweb.podShopReturns.errorQtyTooHigh'),
        pickReason: t('mweb.podShopReturns.errorPickReason'),
        commentsTooLong: t('mweb.podShopReturns.errorCommentsTooLong'),
      }),
    [t],
  );
  const { control, handleSubmit, reset, formState } = useForm<ReturnFormValues>({
    resolver: formResolver<ReturnFormValues>(schema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  });
  const { fields } = useFieldArray({ control, name: 'lines' });
  const linesError = formState.errors.lines?.message ?? formState.errors.lines?.root?.message;

  // One sheet serves every order — re-seed on each open.
  useEffect(() => {
    if (!order) return;
    reset(returnFormDefaults(order));
    setError('');
  }, [order, reset]);

  const submit = handleSubmit(async (values) => {
    if (!order) return;
    setBusy(true);
    setError('');
    const key = reasonKey(values.reason);
    try {
      const input = toReturnInput(order.id, values, key ? t(key) : values.reason);
      await graphqlRequest(RequestPodShopReturnDocument, { input }, { auth: true });
      onRequested();
      onClose();
    } catch (e) {
      setError(parseApiError(e, t('mweb.podShopReturns.submitFailed')));
    } finally {
      setBusy(false);
    }
  });

  return (
    <DuncitDialog
      open={!!order}
      onClose={onClose}
      testID="pod-shop-return-dialog"
      title={t('mweb.podShopReturns.returnItems')}
      subtitle={
        order
          ? t('mweb.podShopReturns.dialogSubtitle', { vars: { orderNo: order.order_no } })
          : undefined
      }
      closeLabel={t('mweb.common.cancel')}
      dismissOnBackdrop={!busy}
      footer={
        <ConfirmFooter
          cancelLabel={t('mweb.common.cancel')}
          confirmLabel={t('mweb.podShopReturns.submit')}
          confirmText={busy ? t('mweb.podShopReturns.submitting') : undefined}
          busy={busy}
          destructive={false}
          cancelTestID="pod-shop-return-cancel"
          confirmTestID="pod-shop-return-submit"
          onCancel={onClose}
          onConfirm={() => {
            submit().catch(() => undefined);
          }}
        />
      }
    >
      <YStack gap={12} testID="pod-shop-return-form">
        <YStack gap={6} role="group" aria-label={t('mweb.podShopReturns.itemsLabel')}>
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t('mweb.podShopReturns.itemsLabel')}
          </Text>
          {fields.map((line, index) => (
            <XStack key={line.id} gap={8} alignItems="center">
              <Text flex={1} fontSize={13} color="$color">
                {line.name}
                {line.variant_label ? ` — ${line.variant_label}` : ''}
              </Text>
              <Controller
                control={control}
                name={`lines.${index}.qty`}
                render={({ field }) => (
                  <ReturnQtyStepper
                    name={line.name}
                    value={field.value}
                    max={line.max}
                    onChange={field.onChange}
                    testID={`pod-shop-return-qty-${index}`}
                  />
                )}
              />
            </XStack>
          ))}
          {linesError ? (
            <Text testID="pod-shop-return-lines-error" role="alert" fontSize={12} color="$danger">
              {linesError}
            </Text>
          ) : null}
        </YStack>
        <Controller
          control={control}
          name="reason"
          render={({ field, fieldState }) => (
            <ReturnReasonList
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <FormTextField
          control={control}
          name="comments"
          label={t('mweb.podShopReturns.commentsLabel')}
          multiline
          numberOfLines={3}
          maxLength={COMMENTS_MAX}
        />
        {error ? (
          <Text testID="pod-shop-return-error" role="alert" fontSize={12} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
