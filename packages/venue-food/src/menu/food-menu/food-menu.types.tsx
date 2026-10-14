import type { FoodMenuConfig, FoodMenuMode, FoodMenuVenue } from '@duncit/utils';
import type { FoodPhotoUpload } from '../fields/FoodDishPhotos';
import type { FoodAccountMode } from '../fields/FoodOrderingFields';

/**
 * The menu form's contract. The values and both mappers are @duncit/utils'
 * (`foodMenuToValues` / `toFoodMenuSaveInput`) and the rules
 * @duncit/forms/schemas' (`makeFoodMenuSchema`) — the native screen binds the
 * same ones — so this file only names what the form is given.
 */
export type { FoodMenuFormValues } from '@duncit/utils';

export interface FoodMenuFormProps {
  /** The venue as the server last returned it — what the form opens on, and the saved GST number. */
  venue: FoodMenuVenue;
  config: FoodMenuConfig;
  mode: FoodMenuMode;
  account: FoodAccountMode;
  upload: FoodPhotoUpload;
  /** Roots the form's test ids. */
  idPrefix: string;
  /** The server's copy after a save. */
  onSaved?: (venue: FoodMenuVenue) => void;
}
