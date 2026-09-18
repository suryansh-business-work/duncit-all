import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

import { useStoreSettings } from '../../../app/providers/StoreSettingsProvider';
import { RhfSelect } from '../../../components/RhfSelect';
import { CANCEL_ORDER } from '../../../graphql/orders';
import { useStoreT } from '../../../i18n';
import { makeCancelOrderSchema, type CancelOrderValues } from './cancel-order.types';

interface CancelOrderDialogProps {
  orderNo: string;
  accessKey?: string;
  onClose: () => void;
}

/** Call the order off before it ships, with one of the store's reasons. */
export function CancelOrderDialog({ orderNo, accessKey, onClose }: Readonly<CancelOrderDialogProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  const { cancel_reasons: reasons } = useStoreSettings();
  const [error, setError] = useState('');
  const schema = useMemo(() => makeCancelOrderSchema(t), [t]);
  const [cancelOrder] = useMutation(CANCEL_ORDER);
  const { control, handleSubmit, formState } = useForm<CancelOrderValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });
  const submit = handleSubmit(async ({ reason }) => {
    setError('');
    try {
      await cancelOrder({ variables: { order_no: orderNo, reason, access_key: accessKey } });
      notifySuccess(t('ecommStore.cancel.done'));
      onClose();
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.cancel.failed')));
    }
  });
  return (
    <Dialog open onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="xs">
      <Stack component="form" onSubmit={submit} noValidate>
        <DialogTitle id={titleId}>{t('ecommStore.cancel.title', { vars: { orderNo } })}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <DialogContentText>{t('ecommStore.cancel.body')}</DialogContentText>
            <RhfSelect control={control} name="reason" label={t('ecommStore.cancel.reason')} options={reasons} />
            <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <DuncitButton onClick={onClose}>{t('ecommStore.cancel.keep')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" color="error" loading={formState.isSubmitting}>
            {t('ecommStore.cancel.confirm')}
          </DuncitButton>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
