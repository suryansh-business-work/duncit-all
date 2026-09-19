import { Controller } from 'react-hook-form';
import { Alert, FormControlLabel, Radio, RadioGroup, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../../components/FormDialog';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import type { NdrAction } from '../../shipping-queries';
import { makeOrderNdrSchema, ORDER_NDR_DEFAULTS, type OrderNdrValues } from './order-ndr.types';

interface OrderNdrFormProps {
  /** What the courier said when the delivery failed. */
  reason: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (action: NdrAction, comments: string) => Promise<boolean>;
}

/**
 * Answer a failed delivery: ask the courier to try again, or to bring the
 * parcel back to the warehouse (return to origin — the stock comes back and
 * the money is settled when it arrives).
 */
export default function OrderNdrForm({ reason, busy, onClose, onSubmit }: Readonly<OrderNdrFormProps>) {
  const { t, form } = useSchemaForm<OrderNdrValues>(makeOrderNdrSchema, ORDER_NDR_DEFAULTS);
  const { control, handleSubmit } = form;
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values.action, values.comments)) onClose();
  });
  return (
    <FormDialog formId="order-ndr-form" title={t('ecommPortal.shipping.ndrTitle')} busy={busy} onClose={onClose} onSubmit={submit} submitLabel={t('ecommPortal.shipping.ndrSend')}>
      <Stack spacing={2}>
        {reason ? <Alert severity="warning">{reason}</Alert> : null}
        <Controller
          control={control}
          name="action"
          render={({ field }) => (
            <RadioGroup {...field} aria-label={t('ecommPortal.shipping.ndrAction')}>
              <FormControlLabel value="REATTEMPT" control={<Radio />} label={t('ecommPortal.shipping.ndrReattempt')} />
              <FormControlLabel value="RETURN" control={<Radio />} label={t('ecommPortal.shipping.ndrReturn')} />
            </RadioGroup>
          )}
        />
        <RhfTextField control={control} name="comments" label={t('ecommPortal.shipping.ndrComments')} hint={t('ecommPortal.shipping.ndrCommentsHint')} multiline minRows={2} />
      </Stack>
    </FormDialog>
  );
}
