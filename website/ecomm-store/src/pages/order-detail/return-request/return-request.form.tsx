import { useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, FormHelperText, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { QuantityStepper } from '../../../components/QuantityStepper';
import { RhfSelect } from '../../../components/RhfSelect';
import type { StoreOrder } from '../../../graphql/orders';
import { REQUEST_RETURN } from '../../../graphql/returns';
import { useStoreT } from '../../../i18n';
import { makeReturnRequestSchema, type ReturnRequestValues } from './return-request.types';

interface ReturnRequestDialogProps {
  order: StoreOrder;
  accessKey?: string;
  onClose: () => void;
}

/** Pick what goes back (never more than is still returnable), why, and any note. */
export function ReturnRequestDialog({ order, accessKey, onClose }: Readonly<ReturnRequestDialogProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  const { return_reasons: reasons } = useStoreSettings();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeReturnRequestSchema(t), [t]);
  const [requestReturn] = useMutation(REQUEST_RETURN, { refetchQueries: ['EcommStoreOrderReturns', 'EcommStoreMyReturns', 'EcommStoreOrder'] });
  const returnable = order.items.filter((item) => item.qty > item.returned_qty);
  const { control, handleSubmit, formState } = useForm<ReturnRequestValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: returnable.map((item) => ({ product_id: item.product_id, variant_id: item.variant_id, qty: 0, max: item.qty - item.returned_qty })),
      reason: '',
      comments: '',
    },
  });
  const itemsError = formState.errors.items?.root?.message ?? formState.errors.items?.message;
  const submit = handleSubmit(async ({ items, reason, comments }) => {
    setError('');
    try {
      const picked = items.filter((i) => i.qty > 0).map((i) => ({ product_id: i.product_id, variant_id: i.variant_id || undefined, qty: i.qty }));
      await requestReturn({ variables: { input: { order_no: order.order_no, access_key: accessKey, items: picked, reason, comments: comments || undefined } } });
      notifySuccess(t('ecommStore.returns.requested'));
      onClose();
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.returns.failed')));
    }
  });
  return (
    <Dialog open onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm" scroll="body">
      <Stack component="form" onSubmit={submit} noValidate>
        <DialogTitle id={titleId}>{t('ecommStore.returns.title', { vars: { orderNo: order.order_no } })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {returnable.map((item, index) => (
              <Stack key={`${item.product_id}:${item.variant_id}`} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 700 }}>{[item.name, item.variant_label].filter(Boolean).join(' · ')}</Typography>
                <Controller
                  control={control}
                  name={`items.${index}.qty`}
                  render={({ field }) => (
                    <QuantityStepper value={field.value} min={0} max={item.qty - item.returned_qty} itemName={item.name} onChange={field.onChange} />
                  )}
                />
              </Stack>
            ))}
            {itemsError ? <FormHelperText error>{itemsError}</FormHelperText> : null}
            <RhfSelect control={control} name="reason" label={t('ecommStore.returns.reason')} options={reasons} />
            <RhfTextField control={control} name="comments" multiline minRows={2} label={t('ecommStore.returns.comments')} />
            <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <DuncitButton onClick={onClose}>{t('ecommStore.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting}>
            {t('ecommStore.returns.submit')}
          </DuncitButton>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
