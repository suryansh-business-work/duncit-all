import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { makeMarkRentalSchema, type MarkRentalValues } from '@duncit/forms/schemas';
import { rentalHandBack, rentalMoney } from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import type { DeskBooking } from '@/hooks/useVenueRentalDesk';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';

type MarkInput = {
  outcome: 'RETURNED' | 'DAMAGED';
  damage_claim: number | null;
  note: string | null;
};

interface Props {
  /** The rental being marked; null closes the sheet. */
  booking: DeskBooking | null;
  /** Finance's rule: whether the venue hands the deposit back at the venue. */
  depositRefundable: boolean;
  onClose: () => void;
  onMark: (id: string, input: MarkInput) => Promise<void>;
}

const DEFAULTS: MarkRentalValues = { outcome: 'RETURNED', damage_claim: '', note: '' };

function MarkForm({
  booking,
  depositRefundable,
  onClose,
  onMark,
}: Readonly<Props & { booking: DeskBooking }>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(
    () => makeMarkRentalSchema(t, booking.deposit_amount),
    [t, booking.deposit_amount],
  );
  const { control, handleSubmit } = useForm<MarkRentalValues>({
    resolver: formResolver<MarkRentalValues>(schema),
    defaultValues: DEFAULTS,
  });
  const outcome = useWatch({ control, name: 'outcome' });
  const claim = useWatch({ control, name: 'damage_claim' });
  // The cash the venue gives back now; Duncit repays the whole deposit in the payout.
  const handBack = rentalHandBack(
    booking.deposit_amount,
    outcome === 'DAMAGED' ? Number(claim) : 0,
    depositRefundable,
  );
  // Nothing to claim from when no deposit was taken.
  const options = [
    { value: 'RETURNED', label: t('venueRentals.mark.returned') },
    ...(booking.deposit_amount > 0
      ? [{ value: 'DAMAGED', label: t('venueRentals.mark.damaged') }]
      : []),
  ];

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    const damaged = values.outcome === 'DAMAGED';
    try {
      await onMark(booking.id, {
        outcome: values.outcome,
        damage_claim: damaged ? Number(values.damage_claim) : null,
        note: damaged ? values.note.trim() : null,
      });
      onClose();
    } catch (e) {
      // The refusal stays in the sheet with what was typed.
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <DuncitDialog
      open
      onClose={busy ? () => undefined : onClose}
      testID="mark-rental-sheet"
      title={t('venueRentals.mark.title', { vars: { name: booking.name } })}
      closeLabel={t('venueRentals.mark.cancel')}
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={
        <ConfirmFooter
          cancelLabel={t('venueRentals.mark.cancel')}
          confirmLabel={t('venueRentals.mark.save')}
          busy={busy}
          destructive={false}
          cancelTestID="mark-rental-cancel"
          confirmTestID="mark-rental-save"
          onCancel={onClose}
          onConfirm={() => {
            submit().catch((e: unknown) => setError(toErrorMessage(e)));
          }}
        />
      }
    >
      <YStack gap={12}>
        <Controller
          control={control}
          name="outcome"
          render={({ field }) => (
            <ChipSelectField
              testID="mark-rental-outcome"
              label={t('venueRentals.mark.outcome')}
              options={options}
              value={field.value}
              onChange={(next) => field.onChange(next === 'DAMAGED' ? 'DAMAGED' : 'RETURNED')}
            />
          )}
        />
        {outcome === 'DAMAGED' ? (
          <>
            <FormTextField
              control={control}
              name="damage_claim"
              label={t('venueRentals.mark.claim')}
              hint={t('venueRentals.mark.claimHint', {
                vars: { max: rentalMoney(booking.currency_symbol, booking.deposit_amount) },
              })}
              keyboardType="decimal-pad"
              required
            />
            <FormTextField
              control={control}
              name="note"
              label={t('venueRentals.mark.note')}
              multiline
              required
            />
          </>
        ) : null}
        {booking.deposit_amount > 0 ? (
          <Text role="status" testID="mark-rental-hand-back" fontSize={13} color="$color">
            {handBack > 0
              ? t('venueRentals.mark.handBack', {
                  vars: { amount: rentalMoney(booking.currency_symbol, handBack) },
                })
              : t('venueRentals.mark.handBackNone')}
          </Text>
        ) : null}
        {error ? (
          <Text role="alert" testID="mark-rental-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}

/**
 * Close a rental the venue handed out: back in good shape, or damaged with
 * part of the deposit kept. The rule is @duncit/forms' (the web dialog binds
 * the same one); keyed on the booking so reopening starts clean.
 */
export function MarkRentalSheet({ booking, ...rest }: Readonly<Props>) {
  return booking ? <MarkForm key={booking.id} booking={booking} {...rest} /> : null;
}
