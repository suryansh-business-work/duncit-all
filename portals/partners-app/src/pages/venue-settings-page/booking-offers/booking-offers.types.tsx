import type { BookingOffersValues } from '@duncit/forms/schemas';

/** The form's values and the stored settings — shared with mWeb and the native app (@duncit/forms). */
export type { BookingOffersValues, VenueOfferSettings } from '@duncit/forms/schemas';

/** What is in effect for the venue — its own value, or Duncit's default where it set 0 (`Venue.offer_*`). */
export interface EffectiveOfferSettings {
  min_guests: number;
  response_hours: number;
}

export interface BookingOffersFormProps {
  initialValues: BookingOffersValues;
  /** Shown under each field so the owner sees what 0 currently means. */
  effective: EffectiveOfferSettings;
  saving: boolean;
  error: string | null;
  onSubmit: (values: BookingOffersValues) => Promise<void>;
}
