import { Controller, useWatch } from 'react-hook-form';
import { Checkbox, FormControlLabel, MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfRefundMode from '../../../../components/form/RhfRefundMode';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import { money, toNumber } from '../../../../lib/format';
import { codeLabel, REFUND_MODE_KEYS, RETURN_STATUS_KEYS } from '../../../../lib/status';
import type { StoreReturn } from '../../queries';
import { makeReturnUpdateSchema, toReturnUpdateInput, toReturnUpdateValues, type ReturnUpdateValues } from './return-update.types';

interface ReturnUpdateFormProps {
  item: StoreReturn;
  busy: boolean;
  onSubmit: (input: ReturnType<typeof toReturnUpdateInput>) => Promise<boolean>;
}

/**
 * Move a return to its next step. The note goes to the buyer in the update
 * email; moving to REFUNDED pays the refund out, so it is confirmed first.
 */
export default function ReturnUpdateForm({ item, busy, onSubmit }: Readonly<ReturnUpdateFormProps>) {
  const { t, form } = useSchemaForm<ReturnUpdateValues>(makeReturnUpdateSchema, toReturnUpdateValues(item));
  const { control, handleSubmit } = form;
  const confirm = useConfirm();
  const status = useWatch({ control, name: 'status' });

  const submit = handleSubmit(async (values) => {
    if (values.status === 'REFUNDED') {
      const ok = await confirm({
        title: t('ecommPortal.returns.refundConfirmTitle', { vars: { amount: money(toNumber(values.refund_amount)) } }),
        message: t('ecommPortal.returns.refundConfirmMessage', { vars: { mode: codeLabel(REFUND_MODE_KEYS, values.refund_mode, t) } }),
        confirmLabel: t('ecommPortal.returns.refundNow'),
        cancelLabel: t('shell.common.cancel'),
        confirmColor: 'warning',
      });
      if (!ok) return;
    }
    await onSubmit(toReturnUpdateInput(values));
  });

  return (
    <form noValidate onSubmit={submit} aria-label={t('ecommPortal.returns.update')}>
      <Stack spacing={1}>
        <RhfTextField control={control} name="status" label={t('ecommPortal.returns.moveTo')} select required>
          {item.next_statuses.map((value) => (
            <MenuItem key={value} value={value}>
              {codeLabel(RETURN_STATUS_KEYS, value, t)}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="note" label={t('ecommPortal.orders.note')} multiline minRows={2} hint={t('ecommPortal.returns.noteHint')} />
        <RhfNumberField control={control} name="refund_amount" label={t('ecommPortal.returns.refund')} hint={t('ecommPortal.returns.refundHint')} />
        <RhfRefundMode control={control} name="refund_mode" isGuest={item.is_guest} />
        {status === 'RECEIVED' && !item.restocked && (
          <Controller
            control={control}
            name="restock"
            render={({ field }) => (
              <FormControlLabel
                label={t('ecommPortal.returns.restock')}
                control={<Checkbox checked={field.value} onChange={(_event, checked) => field.onChange(checked)} onBlur={field.onBlur} />}
              />
            )}
          />
        )}
        <DuncitButton type="submit" variant="contained" loading={busy}>
          {t('ecommPortal.returns.update')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
