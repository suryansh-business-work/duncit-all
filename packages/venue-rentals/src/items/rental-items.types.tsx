import type { FoodPhotoUpload } from '@duncit/venue-food';
import type { RentalItemsConfig, RentalsVenue } from '@duncit/utils';

export interface RentalItemsFormProps {
  venue: RentalsVenue;
  config: RentalItemsConfig;
  upload: FoodPhotoUpload;
  idPrefix: string;
  onSaved?: (venue: RentalsVenue) => void;
}
