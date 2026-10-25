/** The platform defaults as `AppSettings` stores them — used by every venue that set 0. */
export interface VenueOfferDefaults {
  venue_offer_min_guests_default: number;
  venue_offer_response_hours_default: number;
}

/** The form, as typed. */
export interface VenueOfferDefaultsValues {
  venue_offer_min_guests_default: string;
  venue_offer_response_hours_default: string;
}

export interface VenueOffersFormProps {
  initialValues: VenueOfferDefaultsValues;
  saving: boolean;
  /** The server's refusal of the last save, if any. */
  error: string | null;
  onSubmit: (values: VenueOfferDefaultsValues) => Promise<void>;
}
