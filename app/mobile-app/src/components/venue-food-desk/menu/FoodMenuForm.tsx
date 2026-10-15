import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { foodMenuLimitsOf, makeFoodMenuSchema } from '@duncit/forms/schemas';
import {
  blankFoodDish,
  toFoodMenuSaveInput,
  type FoodMenuConfig,
  type FoodMenuFormValues,
  type FoodMenuVenue,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ToggleRow } from '@/components/ToggleRow';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useTranslation } from '@/hooks/useTranslation';
import { saveFoodMenu } from '@/services/venue-food-menu';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';
import { FoodDishCard } from './FoodDishCard';
import { FoodDishSheet } from './FoodDishSheet';
import { FoodMenuLicences } from './FoodMenuLicences';
import { FoodMenuOrdering } from './FoodMenuOrdering';
import { FoodMenuTables } from './FoodMenuTables';
import { foodMenuTextValues } from './foodMenuText';

interface Props {
  venue: FoodMenuVenue;
  config: FoodMenuConfig;
  /** The server's copy after a save. */
  onSaved: (venue: FoodMenuVenue) => void;
}

type Notice = { tone: 'ok' | 'error'; text: string } | null;

/**
 * The venue's food menu on the app — the Tamagui twin of @duncit/venue-food's
 * menu editor, on the same rules (`makeFoodMenuSchema`) and the same mapping
 * (`toFoodMenuSaveInput`), saved through `updateApprovedVenue`. The Razorpay
 * account is the owner's to pick in the Partner console, so a save from here
 * never names it.
 */
export function FoodMenuForm({ venue, config, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePublicFinance();
  const schema = useMemo(
    () => makeFoodMenuSchema(t, { limits: foodMenuLimitsOf(config), editsAccount: false }),
    [t, config],
  );
  const { control, handleSubmit, reset, trigger } = useForm<FoodMenuFormValues>({
    resolver: formResolver<FoodMenuFormValues>(schema),
    defaultValues: foodMenuTextValues(venue),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'food_menu' });
  const offersFood = useWatch({ control, name: 'offers_food' });
  const [editing, setEditing] = useState<{ index: number; isNew: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const atLimit = fields.length >= config.food_menu_limit;
  const savedGstin = venue.gstin ?? '';

  const addDish = () => {
    append(blankFoodDish(config));
    setEditing({ index: fields.length, isNew: true });
  };

  const closeSheet = (discard: boolean) => {
    if (discard && editing) remove(editing.index);
    setEditing(null);
  };

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setNotice(null);
    try {
      const input = toFoodMenuSaveInput(values, { sendAccount: false, mode: 'owner', savedGstin });
      const saved = await saveFoodMenu(venue.id, input);
      reset(foodMenuTextValues(saved));
      setNotice({ tone: 'ok', text: t('venueFoodOwner.menu.saved') });
      onSaved(saved);
    } catch (err) {
      // A refusal stays above the Save button; nothing typed is lost.
      setNotice({ tone: 'error', text: toErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  });

  return (
    <YStack gap={16} testID="food-menu-form">
      <Controller
        control={control}
        name="offers_food"
        render={({ field }) => (
          <ToggleRow
            testID="food-menu-offers-food"
            label={t('venueFoodOwner.menu.offersFood')}
            hint={t('venueFoodOwner.menu.offersFoodHint')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {offersFood ? (
        <YStack gap={12}>
          <FoodMenuLicences control={control} />
          <Text role="heading" fontSize={15} fontWeight="700" color="$color">
            {t('venueFoodOwner.menu.dishes')}
          </Text>
          <Text fontSize={12} color="$muted">
            {t('venueFoodOwner.menu.dishesHint')}
          </Text>
          {fields.length === 0 ? (
            <Text role="status" fontSize={13} color="$muted" testID="food-menu-empty">
              {t('venueFoodOwner.menu.noDishes')}
            </Text>
          ) : null}
          {fields.map((row, index) => (
            <FoodDishCard
              key={row.id}
              control={control}
              index={index}
              config={config}
              currency={currency}
              onEdit={() => setEditing({ index, isNew: false })}
              onRemove={() => remove(index)}
            />
          ))}
          {atLimit ? (
            <Text role="status" fontSize={12} color="$muted">
              {t('venueFoodOwner.menu.menuLimit', { vars: { max: config.food_menu_limit } })}
            </Text>
          ) : null}
          <DuncitButton
            testID="food-menu-add"
            label={t('venueFoodOwner.menu.addDish')}
            variant="outline"
            disabled={atLimit}
            onPress={addDish}
          />
          <FoodMenuOrdering control={control} config={config} savedGstin={savedGstin} />
          <FoodMenuTables
            control={control}
            limit={config.food_table_limit}
            venueId={venue.id}
            venueName={venue.venue_name}
            hasSavedTables={(venue.food_tables ?? []).length > 0}
          />
        </YStack>
      ) : null}
      {notice ? (
        <Text
          role={notice.tone === 'ok' ? 'status' : 'alert'}
          testID="food-menu-notice"
          fontSize={13}
          color={notice.tone === 'ok' ? '$success' : '$danger'}
        >
          {notice.text}
        </Text>
      ) : null}
      <DuncitButton
        testID="food-menu-save"
        label={t('venueFoodOwner.common.save')}
        loading={busy}
        disabled={busy}
        onPress={() => fireAndForget(submit())}
      />
      <FoodDishSheet
        control={control}
        trigger={trigger}
        index={editing?.index ?? null}
        isNew={editing?.isNew ?? false}
        config={config}
        onClose={closeSheet}
      />
    </YStack>
  );
}
