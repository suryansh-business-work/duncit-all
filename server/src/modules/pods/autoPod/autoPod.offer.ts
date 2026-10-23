import type { VenueOfferModel } from '@modules/venues/venueOffer/venueOffer.types';

/** The window a venue commits to an Auto Pod and the price it asks for it. */
export interface AutoPodVenueOffer {
  start_at: string;
  end_at: string;
  space_label?: string | null;
  model: VenueOfferModel;
  rate: number;
}

/** Venues answer an Auto Pod with a window and a price now; an app that still picks a slot is told to update. */
export const UPDATE_APP_FOR_AUTO_POD = 'Auto Pods are accepted with a time and a price now. Please update the app to accept it.';
