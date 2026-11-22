import { z } from 'zod';
import type { VenueKitOfferInput } from '@duncit/gql-types';
import type { useTranslation } from '@duncit/shell';

export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Every field of the plan, with the ceiling the server holds it to. Money is
 * typed in whole rupees here and sent in paise; the ceilings are the server's
 * (`venueKit.validator.ts`) read in rupees, so the form refuses what the API would.
 */
export const OFFER_FIELDS = [
  { name: 'annual_price', labelKey: 'annualPrice', max: 1_000_000, whole: true },
  { name: 'included_table_labels', labelKey: 'includedLabels', max: 1000, whole: true },
  { name: 'extra_label_price', labelKey: 'extraLabelPrice', max: 10_000, whole: true },
  { name: 'pos_activation_months', labelKey: 'posMonths', max: 60, whole: true },
  { name: 'gift_card_count', labelKey: 'giftCardCount', max: 1000, whole: true },
  { name: 'gift_card_value', labelKey: 'giftCardValue', max: 10_000, whole: true },
  { name: 'collab_gift_card_discount_pct', labelKey: 'collabDiscount', max: 100, whole: false },
  { name: 'order_benefit_pct', labelKey: 'orderBenefit', max: 100, whole: false },
] as const;

export type OfferFieldName = (typeof OFFER_FIELDS)[number]['name'];

export const venueKitOfferSchema = (t: Translate) =>
  z.object(
    Object.fromEntries(
      OFFER_FIELDS.map(({ name, max, whole }) => {
        const message = t('venueKit.console.fieldInvalid', { vars: { max } });
        const base = z.coerce.number({ error: message }).min(0, message).max(max, message);
        return [name, whole ? base.int(message) : base];
      })
    ) as Record<OfferFieldName, z.ZodCoercedNumber>
  );

export type VenueKitOfferValues = z.input<ReturnType<typeof venueKitOfferSchema>>;
export type VenueKitOfferOutput = z.output<ReturnType<typeof venueKitOfferSchema>>;

const PAISE = 100;

/** The saved plan, as the form edits it (rupees). */
export function offerToValues(offer: Readonly<VenueKitOfferInput>): Record<OfferFieldName, number> {
  return {
    annual_price: offer.annual_price_paise / PAISE,
    included_table_labels: offer.included_table_labels,
    extra_label_price: offer.extra_label_price_paise / PAISE,
    pos_activation_months: offer.pos_activation_months,
    gift_card_count: offer.gift_card_count,
    gift_card_value: offer.gift_card_value_paise / PAISE,
    collab_gift_card_discount_pct: offer.collab_gift_card_discount_pct,
    order_benefit_pct: offer.order_benefit_pct,
  };
}

/** The form's answer, as the API takes it (paise, integers). */
export function valuesToOffer(values: Readonly<VenueKitOfferOutput>): VenueKitOfferInput {
  return {
    annual_price_paise: Math.round(values.annual_price * PAISE),
    included_table_labels: values.included_table_labels,
    extra_label_price_paise: Math.round(values.extra_label_price * PAISE),
    pos_activation_months: values.pos_activation_months,
    gift_card_count: values.gift_card_count,
    gift_card_value_paise: Math.round(values.gift_card_value * PAISE),
    collab_gift_card_discount_pct: values.collab_gift_card_discount_pct,
    order_benefit_pct: values.order_benefit_pct,
  };
}

export interface VenueKitOfferFormProps {
  open: boolean;
  offer: Readonly<VenueKitOfferInput>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: VenueKitOfferInput) => void;
}
