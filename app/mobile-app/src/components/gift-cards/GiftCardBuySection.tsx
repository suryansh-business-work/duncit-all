import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { YStack } from 'tamagui';
import {
  canOrderPhysical,
  giftCardPurchaseDefaults,
  giftCardPurchaseRecipient,
  giftCardPurchaseTotals,
  makeGiftCardPurchaseSchema,
  maxQuantityFor,
  type GiftCardPurchasePolicy,
  type GiftCardPurchaseValues,
} from '@duncit/forms/schemas';

import { PrimaryButton } from '@/components/PrimaryButton';
import type { GiftCardDesign, GiftCardStorefront } from '@/hooks/useGiftCards';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import type { GiftCardSelection } from '@/utils/gift-cards';
import { GiftCardScopeType } from '@/generated/graphql/graphql';
import { GiftCardAmountPicker } from './GiftCardAmountPicker';
import { GiftCardDeliveryPicker } from './GiftCardDeliveryPicker';
import { GiftCardHowItWorks } from './GiftCardHowItWorks';
import { GiftCardQuantityPicker } from './GiftCardQuantityPicker';
import { GiftCardRecipientFields } from './GiftCardRecipientFields';
import { GiftCardTotalCard } from './GiftCardTotalCard';
import { GiftCardVisual } from './GiftCardVisual';

interface Props {
  storefront: GiftCardStorefront;
  design: GiftCardDesign;
  onContinue: (selection: GiftCardSelection) => void;
}

const policyOf = (s: GiftCardStorefront): GiftCardPurchasePolicy => ({
  min_amount: s.settings.min_amount,
  max_amount: s.settings.max_amount,
  max_quantity: s.settings.max_quantity,
  physical_enabled: s.settings.physical_enabled,
  physical_available: s.physical_available,
  shipping_fee: s.settings.shipping_fee,
});

/**
 * The Buy tab: the one gift card (the default design, flippable) → amount →
 * how many → email or printed → who it is for → Continue, over the
 * instruction block. Validated by the shared purchase schema mWeb uses too.
 */
export function GiftCardBuySection({ storefront, design, onContinue }: Readonly<Props>) {
  const { t } = useTranslation();
  const { settings, currency_symbol: currency } = storefront;
  const policy = useMemo(() => policyOf(storefront), [storefront]);
  const schema = useMemo(() => makeGiftCardPurchaseSchema(t, policy), [t, policy]);
  const { control, setValue, handleSubmit, formState } = useForm<GiftCardPurchaseValues>({
    defaultValues: giftCardPurchaseDefaults(settings.denominations, policy),
    resolver: zodResolver(schema),
    mode: 'onChange',
  });
  const values = useWatch({ control }) as GiftCardPurchaseValues;
  const set = <K extends keyof GiftCardPurchaseValues>(name: K, value: GiftCardPurchaseValues[K]) =>
    setValue(name, value as never, { shouldValidate: true, shouldDirty: true });
  const totals = giftCardPurchaseTotals(values, settings.shipping_fee);
  const errors = formState.errors;
  // One amount in the form; the picker shows it as a chip when it is one, else as typed.
  const chip = settings.denominations.includes(Number(values.amount))
    ? Number(values.amount)
    : null;

  const continueToPayment = handleSubmit((valid) =>
    onContinue({
      design_id: design.id,
      design_name: design.name,
      front_url: design.front_image_url,
      back_url: design.back_image_url,
      amount: totals.amount,
      quantity: totals.quantity,
      delivery_mode: valid.delivery_mode,
      shipping_fee: totals.shippingFee,
      gift: valid.delivery_mode === 'DIGITAL' && valid.gift,
      ...giftCardPurchaseRecipient(valid),
    }),
  );

  return (
    <YStack gap={16}>
      <GiftCardVisual
        testID="gift-card-preview"
        theme={{ scope_type: GiftCardScopeType.Shop, scope_name: '', design_name: design.name }}
        imageUrl=""
        artworkFrontUrl={design.front_image_url}
        artworkBackUrl={design.back_image_url}
        amountLabel={formatMoney(currency, totals.amount)}
        minHeight={180}
      />
      <GiftCardAmountPicker
        denominations={settings.denominations}
        min={settings.min_amount}
        max={settings.max_amount}
        currency={currency}
        selected={chip}
        customText={chip === null ? values.amount : ''}
        error={errors.amount?.message ?? null}
        onSelect={(picked) => set('amount', String(picked))}
        onCustomChange={(text) => set('amount', text)}
      />
      <GiftCardDeliveryPicker
        value={values.delivery_mode}
        physicalAvailable={canOrderPhysical(policy)}
        shippingFee={settings.shipping_fee}
        currency={currency}
        onChange={(next) => set('delivery_mode', next)}
      />
      <GiftCardQuantityPicker
        value={values.quantity}
        max={maxQuantityFor(policy, values.delivery_mode)}
        error={errors.quantity?.message}
        onChange={(next) => set('quantity', next)}
      />
      <GiftCardRecipientFields
        printed={values.delivery_mode === 'PHYSICAL'}
        forGift={values.gift}
        email={values.recipient_email}
        name={values.recipient_name}
        message={values.message}
        emailError={
          values.recipient_email.trim() === '' ? null : (errors.recipient_email?.message ?? null)
        }
        onToggle={(next) => set('gift', next)}
        onEmail={(next) => set('recipient_email', next)}
        onName={(next) => set('recipient_name', next)}
        onMessage={(next) => set('message', next)}
      />
      <GiftCardTotalCard totals={totals} currency={currency} />
      <PrimaryButton
        testID="gift-card-continue"
        label={t('mweb.giftCards.continueCta')}
        disabled={!formState.isValid}
        onPress={continueToPayment}
      />
      <GiftCardHowItWorks />
    </YStack>
  );
}
