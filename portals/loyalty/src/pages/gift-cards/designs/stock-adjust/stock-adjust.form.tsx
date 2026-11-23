import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import {
  BLANK_STOCK_ADJUST,
  STOCK_LIMITS,
  makeStockAdjustSchema,
  toStockDelta,
  type StockAdjustFormProps,
  type StockAdjustValues,
} from './stock-adjust.types';

const TITLE_ID = 'stock-adjust-title';
const BODY_ID = 'stock-adjust-body';

/** Corrects a design's printed-card count — after a print run, or for damaged cards — and says why. */
export default function StockAdjustForm({
  open,
  designName,
  currentStock,
  busy,
  errorMessage,
  onCancel,
  onSubmit,
}: Readonly<StockAdjustFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeStockAdjustSchema(t, currentStock), [t, currentStock]);
  const { control, handleSubmit, reset } = useForm<StockAdjustValues>({
    defaultValues: BLANK_STOCK_ADJUST,
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  // Every opening starts clean — a count typed for another design must not carry over.
  useEffect(() => {
    if (open) reset(BLANK_STOCK_ADJUST);
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} aria-labelledby={TITLE_ID} aria-describedby={BODY_ID} fullWidth maxWidth="sm">
      <form
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(toStockDelta(values), values.reason.trim()))}
        data-testid="stock-adjust-form"
      >
        <DialogTitle id={TITLE_ID}>{t('loyalty.designs.stockTitle', { vars: { name: designName } })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText id={BODY_ID}>
              {t('loyalty.designs.stockBody', { vars: { n: currentStock } })}
            </DialogContentText>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <ToggleButtonGroup
                  exclusive
                  value={field.value}
                  onChange={(_e, value) => value && field.onChange(value)}
                  aria-label={t('loyalty.designs.stockDirection')}
                  size="small"
                >
                  <ToggleButton value="ADD" data-testid="stock-add">{t('loyalty.designs.stockAdd')}</ToggleButton>
                  <ToggleButton value="REMOVE" data-testid="stock-remove">{t('loyalty.designs.stockRemove')}</ToggleButton>
                </ToggleButtonGroup>
              )}
            />
            <RhfTextField
              control={control}
              name="quantity"
              label={t('loyalty.designs.stockQuantity')}
              required
              inputMode="numeric"
              data-testid="stock-quantity"
            />
            <RhfTextField
              control={control}
              name="reason"
              label={t('loyalty.designs.stockReason')}
              required
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: STOCK_LIMITS.reasonMax } }}
              data-testid="stock-reason"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('loyalty.designs.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} data-testid="stock-confirm">
            {t('loyalty.designs.stockConfirm')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
