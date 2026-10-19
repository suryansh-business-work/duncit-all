import { useId, useMemo } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { rentalHandBack, rentalMoney } from '@duncit/utils';
import { makeMarkRentalSchema } from '@duncit/forms/schemas';
import type { MarkRentalFormProps, MarkRentalOutput, MarkRentalValues } from './mark-rental.types';

const DEFAULTS: MarkRentalValues = { outcome: 'RETURNED', damage_claim: '', note: '' };

/** The venue records the item back, or keeps part of the deposit for damage. */
export default function MarkRentalForm({
  booking,
  depositRefundable,
  busy,
  errorMessage,
  onSubmit,
  onCancel,
}: Readonly<MarkRentalFormProps>) {
  const { t } = useTranslation();
  const labelId = useId();
  const schema = useMemo(() => makeMarkRentalSchema(t, booking.deposit_amount), [t, booking.deposit_amount]);
  const { control, handleSubmit } = useForm<MarkRentalValues, unknown, MarkRentalOutput>({
    defaultValues: DEFAULTS,
    resolver: zodResolver(schema) as unknown as Resolver<MarkRentalValues, unknown, MarkRentalOutput>,
    mode: 'onBlur',
  });
  const outcome = useWatch({ control, name: 'outcome' });
  const claim = useWatch({ control, name: 'damage_claim' });
  // Nothing to claim from when no deposit was taken.
  const canClaim = booking.deposit_amount > 0;
  // The cash the venue gives back right now; Duncit repays the whole deposit in the payout.
  const handBack = rentalHandBack(booking.deposit_amount, outcome === 'DAMAGED' ? Number(claim) : 0, depositRefundable);

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="mark-rental-form">
      <Stack spacing={2.5}>
        {errorMessage && (
          <Alert severity="error" data-testid="mark-rental-error">
            {errorMessage}
          </Alert>
        )}
        <Controller
          control={control}
          name="outcome"
          render={({ field }) => (
            <FormControl>
              <FormLabel id={labelId}>{t('venueRentals.mark.outcome')}</FormLabel>
              <RadioGroup {...field} aria-labelledby={labelId}>
                <FormControlLabel value="RETURNED" control={<Radio />} label={t('venueRentals.mark.returned')} />
                {canClaim && (
                  <FormControlLabel value="DAMAGED" control={<Radio />} label={t('venueRentals.mark.damaged')} />
                )}
              </RadioGroup>
            </FormControl>
          )}
        />
        {outcome === 'DAMAGED' && (
          <>
            <RhfTextField
              control={control}
              name="damage_claim"
              label={t('venueRentals.mark.claim')}
              hint={t('venueRentals.mark.claimHint', {
                vars: { max: rentalMoney(booking.currency_symbol, booking.deposit_amount) },
              })}
              type="number"
              slotProps={{ htmlInput: { min: 0, max: booking.deposit_amount, step: 1 } }}
              data-testid="mark-rental-claim"
            />
            <RhfTextField
              control={control}
              name="note"
              label={t('venueRentals.mark.note')}
              multiline
              minRows={2}
              data-testid="mark-rental-note"
            />
          </>
        )}
        {canClaim && (
          <Alert severity="info" data-testid="mark-rental-hand-back" aria-live="polite">
            {handBack > 0
              ? t('venueRentals.mark.handBack', { vars: { amount: rentalMoney(booking.currency_symbol, handBack) } })
              : t('venueRentals.mark.handBackNone')}
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('venueRentals.mark.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy} disabled={busy} data-testid="mark-rental-save">
            {t('venueRentals.mark.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
