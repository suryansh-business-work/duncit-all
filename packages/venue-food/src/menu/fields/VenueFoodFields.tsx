import type { ReactNode } from 'react';
import { useWatch, type FieldValues } from 'react-hook-form';
import { Divider, Stack } from '@mui/material';
import type { FoodMenuConfig } from '@duncit/utils';
import FoodDishList from './FoodDishList';
import type { FoodPhotoUpload } from './FoodDishPhotos';
import FoodLicenceFields from './FoodLicenceFields';
import FoodOffersSwitch from './FoodOffersSwitch';
import FoodTablesFields from './FoodTablesFields';
import FoodOrderingFields, { type FoodAccountMode } from './FoodOrderingFields';
import { offersFoodPath, type FoodControlProps } from './food-paths';

export interface VenueFoodFieldsProps<T extends FieldValues, TOut = T> extends FoodControlProps<T, TOut> {
  config: FoodMenuConfig;
  account: FoodAccountMode;
  upload: FoodPhotoUpload;
  /** Roots every test id and keeps two forms' ids apart (`register-venue`, `venue-editor`, `venue-food-menu`). */
  idPrefix: string;
  /** The GST-number field, which each form names and locks its own way — shown with the ordering fields. */
  gstin?: ReactNode;
  /** The venue's name — the table stickers' file is named after it. */
  venueName?: string;
  /** The venue has tables saved — only then can its stickers be printed (the server prints the saved list). */
  hasSavedTables?: boolean;
  /** Draw the dish list. Off on the Partner console's Food Settings page, which
   * sets up everything but the menu (Food > Menu edits that). Default on. */
  showMenu?: boolean;
}

/**
 * A venue's food block — the ONE set of fields every venue form mounts: the
 * menu editor (Partners, Venues console, mWeb), the Partners venue form's Food
 * section and the Venues console editor's. The switch, then — while the venue
 * serves food — its licences, its dishes, QR ordering with its discount and
 * GST, the invoice GST number, and its tables with their QR stickers. The rules are `makeVenueFoodRefinement` (@duncit/forms).
 */
export default function VenueFoodFields<T extends FieldValues, TOut = T>({
  control,
  config,
  account,
  upload,
  idPrefix,
  gstin,
  venueName,
  hasSavedTables = false,
  showMenu = true,
}: Readonly<VenueFoodFieldsProps<T, TOut>>) {
  const offersFood = useWatch({ control, name: offersFoodPath<T>() }) === true;

  return (
    <Stack spacing={2.5}>
      <FoodOffersSwitch control={control} idPrefix={idPrefix} />
      {offersFood && (
        <>
          <FoodLicenceFields control={control} upload={upload} idPrefix={idPrefix} />
          {showMenu && (
            <>
              <Divider flexItem />
              <FoodDishList control={control} config={config} upload={upload} idPrefix={idPrefix} />
            </>
          )}
          <Divider flexItem />
          <FoodOrderingFields control={control} config={config} account={account} idPrefix={idPrefix} />
          {gstin}
          <Divider flexItem />
          <FoodTablesFields
            control={control}
            limit={config.food_table_limit}
            venueId={upload.venueId}
            venueName={venueName}
            hasSavedTables={hasSavedTables}
            idPrefix={idPrefix}
          />
        </>
      )}
    </Stack>
  );
}
