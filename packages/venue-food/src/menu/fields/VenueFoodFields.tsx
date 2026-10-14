import type { ReactNode } from 'react';
import { useWatch, type FieldValues } from 'react-hook-form';
import { Divider, Stack } from '@mui/material';
import type { FoodMenuConfig } from '@duncit/utils';
import FoodDishList from './FoodDishList';
import type { FoodPhotoUpload } from './FoodDishPhotos';
import FoodOffersSwitch from './FoodOffersSwitch';
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
}

/**
 * A venue's food block — the ONE set of fields every venue form mounts: the
 * menu editor (Partners, Venues console, mWeb), the Partners venue form's Food
 * section and the Venues console editor's. The switch, then — while the venue
 * serves food — its dishes, QR ordering with its discount and GST, and the
 * invoice GST number. The rules are `makeVenueFoodRefinement` (@duncit/forms).
 */
export default function VenueFoodFields<T extends FieldValues, TOut = T>({
  control,
  config,
  account,
  upload,
  idPrefix,
  gstin,
}: Readonly<VenueFoodFieldsProps<T, TOut>>) {
  const offersFood = useWatch({ control, name: offersFoodPath<T>() }) === true;

  return (
    <Stack spacing={2.5}>
      <FoodOffersSwitch control={control} idPrefix={idPrefix} />
      {offersFood && (
        <>
          <FoodDishList control={control} config={config} upload={upload} idPrefix={idPrefix} />
          <Divider flexItem />
          <FoodOrderingFields control={control} config={config} account={account} idPrefix={idPrefix} />
          {gstin}
        </>
      )}
    </Stack>
  );
}
