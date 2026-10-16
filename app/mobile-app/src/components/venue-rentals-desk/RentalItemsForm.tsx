import { useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { makeRentalItemsSchema } from '@duncit/forms/schemas';
import { partnerPortalUrl } from '@duncit/onboarding';
import {
  emptyRentalItem,
  rentalItemsToValues,
  type RentalItemsConfig,
  type RentalItemsValues,
  type RentalsVenue,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';
import { stripHtml } from '@/utils/html';

import { RentalItemCard } from './RentalItemCard';
import { RentalItemSheet } from './RentalItemSheet';

interface Props {
  venue: RentalsVenue;
  config: RentalItemsConfig;
  onSave: (values: RentalItemsValues) => Promise<void>;
}

type Notice = { tone: 'ok' | 'error'; text: string } | null;

/** The form holds numbers as typed text; the shared rules coerce them back. */
const textValues = (venue: RentalsVenue): RentalItemsValues => {
  const values = rentalItemsToValues(venue);
  return {
    ...values,
    items: values.items.map((item) => ({
      ...item,
      rate: String(item.rate),
      deposit: String(item.deposit),
      stock: String(item.stock),
      per_guest_limit: String(item.per_guest_limit),
    })),
  };
};

/**
 * The venue's rented items on the app — the Tamagui twin of
 * @duncit/venue-rentals' editor, on the same rules (`makeRentalItemsSchema`)
 * and mapping, saved through `updateApprovedVenue`. The venue's terms are
 * rich text, written in the Partner console; here they are read.
 */
export function RentalItemsForm({ venue, config, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeRentalItemsSchema(t, config), [t, config]);
  const { control, handleSubmit, reset, trigger } = useForm<RentalItemsValues>({
    resolver: formResolver<RentalItemsValues>(schema),
    defaultValues: textValues(venue),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [editing, setEditing] = useState<{ index: number; isNew: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const terms = stripHtml(venue.rental_terms_html);

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setNotice(null);
    try {
      await onSave(values);
      reset(values);
      setNotice({ tone: 'ok', text: t('venueRentals.items.saved') });
    } catch (err) {
      // A refusal stays above the Save button; nothing typed is lost.
      setNotice({ tone: 'error', text: toErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  });

  return (
    <YStack gap={14} testID="rental-items-form">
      <Text fontSize={13} color="$muted">
        {t('venueRentals.items.subtitle')}
      </Text>
      <Controller
        control={control}
        name="offers_rentals"
        render={({ field }) => (
          <ToggleRow
            testID="rental-items-offers"
            label={t('venueRentals.items.offers')}
            hint={t('venueRentals.items.offersHint')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <YStack gap={6} testID="rental-items-terms">
        <Text fontSize={14} fontWeight="700" color="$color">
          {t('venueRentals.items.terms')}
        </Text>
        {terms ? (
          <Text fontSize={13} color="$color">
            {terms}
          </Text>
        ) : null}
        <Text fontSize={12} color="$muted">
          {t('venueRentals.items.termsReadOnly')}
        </Text>
        <DuncitButton
          testID="rental-items-edit-terms"
          label={t('venueRentals.items.editTerms')}
          variant="ghost"
          size="sm"
          onPress={() =>
            fireAndForget(
              Linking.openURL(partnerPortalUrl('/venues/rented-items?selectedtab_rentals=items')),
            )
          }
        />
      </YStack>
      {fields.length === 0 ? (
        <Text role="status" fontSize={13} color="$muted" testID="rental-items-empty">
          {t('venueRentals.items.empty')}
        </Text>
      ) : null}
      {fields.map((row, index) => (
        <RentalItemCard
          key={row.id}
          control={control}
          index={index}
          config={config}
          onEdit={() => setEditing({ index, isNew: false })}
          onRemove={() => remove(index)}
        />
      ))}
      <DuncitButton
        testID="rental-items-add"
        label={t('venueRentals.items.add')}
        variant="outline"
        disabled={fields.length >= config.rental_item_limit}
        onPress={() => {
          append(emptyRentalItem());
          setEditing({ index: fields.length, isNew: true });
        }}
      />
      {notice ? (
        <Text
          role={notice.tone === 'error' ? 'alert' : 'status'}
          fontSize={12.5}
          color={notice.tone === 'error' ? '$danger' : '$accent'}
        >
          {notice.text}
        </Text>
      ) : null}
      <DuncitButton
        testID="rental-items-save"
        label={t('venueRentals.items.save')}
        loading={busy}
        onPress={() => fireAndForget(submit())}
      />
      <RentalItemSheet
        control={control}
        trigger={trigger}
        index={editing?.index ?? null}
        config={config}
        isNew={editing?.isNew ?? false}
        onClose={(discard) => {
          if (discard && editing) remove(editing.index);
          setEditing(null);
        }}
      />
    </YStack>
  );
}
