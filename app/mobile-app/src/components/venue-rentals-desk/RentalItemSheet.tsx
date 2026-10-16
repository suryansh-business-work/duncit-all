import { Controller, type Control, type UseFormTrigger } from 'react-hook-form';
import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import type { RentalItemsConfig, RentalItemsValues } from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  control: Control<RentalItemsValues>;
  trigger: UseFormTrigger<RentalItemsValues>;
  /** The item being edited — its row in the list; null when closed. */
  index: number | null;
  config: RentalItemsConfig;
  /** Closes the sheet; `discard` is true for an item added and then cancelled. */
  onClose: (discard: boolean) => void;
  isNew: boolean;
}

/**
 * One rented item's details — name, description, how it is charged, rate,
 * deposit, units per pod and the most per guest — edited in a sheet over the
 * list. Done checks the item against the shared rules before letting go.
 * Photos and the "available" switch sit on the item's card.
 */
export function RentalItemSheet({
  control,
  trigger,
  index,
  config,
  onClose,
  isNew,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [diag, setDiag] = useState('');
  if (index === null) return null;
  const name = (field: 'name' | 'description' | 'rate' | 'deposit' | 'stock' | 'per_guest_limit') =>
    `items.${index}.${field}` as const;
  const units = config.rental_units.map((unit) => ({
    value: unit,
    label: t(unit === 'HOUR' ? 'venueRentals.items.unitHour' : 'venueRentals.items.unitSlot'),
  }));

  const done = async () => {
    try {
      const ok = await trigger(`items.${index}`);
      const c = control as unknown as {
        _formValues: { items: unknown[] };
        _formState: { errors: unknown };
      };
      const dump = JSON.stringify(
        { values: c._formValues.items[index], errors: c._formState.errors },
        (k, v) => (k === 'ref' ? undefined : v),
      );
      setDiag(`DIAGSHEET ok=${String(ok)} ${dump.replaceAll('"', "'")}`);
      if (ok) onClose(false);
    } catch (e) {
      setDiag(`DIAGSHEET THREW ${String(e)}`);
    }
  };

  return (
    <DuncitDialog
      open
      onClose={() => onClose(isNew)}
      testID="rental-item-sheet"
      title={t('venueRentals.items.itemTitle', { vars: { n: index + 1 } })}
      closeLabel={t('venueRentals.mark.cancel')}
      dismissOnBackdrop={false}
      footer={
        <ConfirmFooter
          cancelLabel={t('venueRentals.mark.cancel')}
          confirmLabel={t('venueRentals.mark.save')}
          busy={false}
          destructive={false}
          cancelTestID="rental-item-cancel"
          confirmTestID="rental-item-done"
          onCancel={() => onClose(isNew)}
          onConfirm={() => fireAndForget(done())}
        />
      }
    >
      <YStack gap={12}>
        <Text>{diag}</Text>
        <FormTextField
          control={control}
          name={name('name')}
          label={t('venueRentals.items.name')}
          required
        />
        <FormTextField
          control={control}
          name={name('description')}
          label={t('venueRentals.items.description')}
          multiline
        />
        <Controller
          control={control}
          name={`items.${index}.unit`}
          render={({ field }) => (
            <ChipSelectField
              testID="rental-item-unit"
              label={t('venueRentals.items.unit')}
              options={units}
              value={field.value}
              onChange={(next) => field.onChange(next === 'HOUR' ? 'HOUR' : 'SLOT')}
            />
          )}
        />
        <FormTextField
          control={control}
          name={name('rate')}
          label={t('venueRentals.items.rate')}
          keyboardType="number-pad"
          required
        />
        <FormTextField
          control={control}
          name={name('deposit')}
          label={t('venueRentals.items.deposit')}
          hint={t('venueRentals.items.depositHint')}
          keyboardType="number-pad"
        />
        <FormTextField
          control={control}
          name={name('stock')}
          label={t('venueRentals.items.stock')}
          keyboardType="number-pad"
          required
        />
        <FormTextField
          control={control}
          name={name('per_guest_limit')}
          label={t('venueRentals.items.perGuest')}
          keyboardType="number-pad"
          required
        />
      </YStack>
    </DuncitDialog>
  );
}
