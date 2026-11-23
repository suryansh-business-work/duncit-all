import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
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
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardVisual from './GiftCardVisual';
import AmountPicker from './AmountPicker';
import QuantityPicker from './QuantityPicker';
import DeliveryModePicker from './DeliveryModePicker';
import GiftRecipientFields from './GiftRecipientFields';
import OrderTotalCard from './OrderTotalCard';
import type { GiftCardPublicDesign, GiftCardSelection, GiftCardStorefront } from './queries';

interface BuyFormProps {
  store: GiftCardStorefront;
  design: GiftCardPublicDesign;
}

const policyOf = (store: GiftCardStorefront): GiftCardPurchasePolicy => ({
  min_amount: store.settings.min_amount,
  max_amount: store.settings.max_amount,
  max_quantity: store.settings.max_quantity,
  physical_enabled: store.settings.physical_enabled,
  physical_available: store.physical_available,
  shipping_fee: store.settings.shipping_fee,
});

/** The buy form — validated by the shared purchase schema the native app uses too. */
export default function BuyForm({ store, design }: Readonly<BuyFormProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const policy = useMemo(() => policyOf(store), [store]);
  const schema = useMemo(() => makeGiftCardPurchaseSchema(t, policy), [t, policy]);
  const { control, setValue, handleSubmit, formState } = useForm<GiftCardPurchaseValues>({
    defaultValues: giftCardPurchaseDefaults(store.settings.denominations, policy),
    resolver: zodResolver(schema),
    mode: 'onChange',
  });
  const values = useWatch({ control }) as GiftCardPurchaseValues;
  const set = <K extends keyof GiftCardPurchaseValues>(name: K, value: GiftCardPurchaseValues[K]) =>
    setValue(name, value as never, { shouldValidate: true, shouldDirty: true });
  const totals = giftCardPurchaseTotals(values, store.settings.shipping_fee);
  const printed = values.delivery_mode === 'PHYSICAL';
  const errors = formState.errors;

  const onContinue = handleSubmit((valid) => {
    const selection: GiftCardSelection = {
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
    };
    navigate('/gift-cards/checkout', { state: selection });
  });

  return (
    <Stack component="form" noValidate onSubmit={onContinue} spacing={2} data-testid="gift-card-buy-form">
      <GiftCardVisual
        testId="gift-card-preview"
        scopeType="SHOP"
        scopeCategoryId={null}
        scopeName=""
        designName={design.name}
        scopeImageUrl={design.front_image_url}
        artworkFrontUrl={design.front_image_url}
        artworkBackUrl={design.back_image_url}
        amount={totals.amount}
        currencySymbol={store.currency_symbol}
      />
      <AmountPicker
        settings={store.settings}
        currencySymbol={store.currency_symbol}
        amountStr={values.amount}
        onChange={(next) => set('amount', next)}
      />
      <DeliveryModePicker
        value={values.delivery_mode}
        physicalAvailable={canOrderPhysical(policy)}
        shippingFee={store.settings.shipping_fee}
        currencySymbol={store.currency_symbol}
        onChange={(next) => set('delivery_mode', next)}
      />
      <QuantityPicker
        value={values.quantity}
        max={maxQuantityFor(policy, values.delivery_mode)}
        error={errors.quantity?.message}
        onChange={(next) => set('quantity', next)}
      />
      <GiftRecipientFields
        printed={printed}
        gift={values.gift}
        onGift={(next) => set('gift', next)}
        email={values.recipient_email}
        onEmail={(next) => set('recipient_email', next)}
        emailError={!!errors.recipient_email && values.recipient_email.trim() !== ''}
        name={values.recipient_name}
        onName={(next) => set('recipient_name', next)}
        message={values.message}
        onMessage={(next) => set('message', next)}
      />
      <OrderTotalCard totals={totals} currencySymbol={store.currency_symbol} />
      <DuncitButton data-testid="gift-card-continue" type="submit" variant="contained" size="large" fullWidth disabled={!formState.isValid}>
        {t('mweb.giftCards.continueCta')}
      </DuncitButton>
    </Stack>
  );
}
