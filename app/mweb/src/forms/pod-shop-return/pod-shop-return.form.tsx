import { useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import RhfTextField from '../components/RhfTextField';
import ReturnQtyStepper from './ReturnQtyStepper';
import {
  RETURN_COMMENTS_MAX,
  RETURN_REASONS,
  returnFormDefaults,
  type ReturnFormValues,
} from '@duncit/utils';
import { makePodShopReturnSchema } from '@duncit/forms/schemas';
import type { ProductOrder } from '../../pages/pod-history-page/productOrders';
import { DIALOG_ACTIONS_SX, DIALOG_PILL_SX } from '../../components/dialog-styles';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  order: ProductOrder;
  busy: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (values: ReturnFormValues) => Promise<void>;
}

/**
 * "Return items" (RHF + Zod + MUI): a stepper per line that can still go back,
 * one reason, optional comments. Rendered inside PodShopReturnDialog, which owns
 * the mutation. Native twin: components/orders-history/PodShopReturnSheet.
 */
export default function PodShopReturnForm({ order, busy, errorMessage, onCancel, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      makePodShopReturnSchema(t),
    [t]
  );
  const { control, handleSubmit, formState } = useForm({
    defaultValues: returnFormDefaults(order),
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });
  const { fields } = useFieldArray({ control, name: 'lines' });
  const linesError = formState.errors.lines?.message ?? formState.errors.lines?.root?.message;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} data-testid="pod-shop-return-form">
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.podShopReturns.dialogSubtitle', { vars: { orderNo: order.order_no } })}
          </Typography>
          <Stack spacing={1} role="group" aria-labelledby="pod-shop-return-items-label">
            <Typography id="pod-shop-return-items-label" variant="overline" sx={{ color: 'text.secondary' }}>
              {t('mweb.podShopReturns.itemsLabel')}
            </Typography>
            {fields.map((line, index) => (
              <Stack key={line.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                  {line.name}
                  {line.variant_label ? ` — ${line.variant_label}` : ''}
                </Typography>
                <Controller
                  control={control}
                  name={`lines.${index}.qty`}
                  render={({ field }) => (
                    <ReturnQtyStepper
                      name={line.name}
                      value={field.value}
                      max={line.max}
                      onChange={field.onChange}
                      testId={`pod-shop-return-qty-${index}`}
                    />
                  )}
                />
              </Stack>
            ))}
            {linesError && (
              <Typography variant="caption" color="error" role="alert" data-testid="pod-shop-return-lines-error">
                {linesError}
              </Typography>
            )}
          </Stack>
          <Controller
            control={control}
            name="reason"
            render={({ field, fieldState }) => (
              <FormControl component="fieldset" variant="standard" error={!!fieldState.error}>
                <FormLabel component="legend" sx={{ typography: 'overline', color: 'text.secondary' }}>
                  {t('mweb.podShopReturns.reasonLabel')}
                </FormLabel>
                <RadioGroup
                  data-testid="pod-shop-return-reasons"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                >
                  {RETURN_REASONS.map((reason) => (
                    <FormControlLabel
                      key={reason.id}
                      value={reason.id}
                      data-testid={`pod-shop-return-reason-${reason.id}`}
                      control={<Radio size="small" />}
                      label={<Typography variant="body2">{t(reason.key)}</Typography>}
                    />
                  ))}
                </RadioGroup>
                {fieldState.error && (
                  <Typography variant="caption" color="error" role="alert">
                    {fieldState.error.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />
          <RhfTextField
            control={control}
            name="comments"
            label={t('mweb.podShopReturns.commentsLabel')}
            multiline
            minRows={2}
            size="small"
            slotProps={{ htmlInput: { maxLength: RETURN_COMMENTS_MAX } }}
          />
          {errorMessage && (
            <Alert severity="error" data-testid="pod-shop-return-error">
              {errorMessage}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={DIALOG_ACTIONS_SX}>
        <DuncitButton data-testid="pod-shop-return-cancel" onClick={onCancel} disabled={busy} sx={DIALOG_PILL_SX}>
          {t('mweb.common.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          variant="contained"
          disabled={busy}
          aria-busy={busy}
          data-testid="pod-shop-return-submit"
          sx={DIALOG_PILL_SX}
        >
          {busy ? t('mweb.podShopReturns.submitting') : t('mweb.podShopReturns.submit')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
