import type { Control } from 'react-hook-form';
import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { FoodGstinField as SharedFoodGstinField } from '@duncit/venue-food';
import type { RegisterVenueMode, RegisterVenueValues } from '../../register-venue';

interface Props {
  control: Control<RegisterVenueValues, unknown, RegisterVenueValues>;
  mode: RegisterVenueMode;
  /** The GST number the venue already has; '' when none. */
  savedGstin: string;
}

/**
 * The GST number printed on the venue's food invoices — the shared field
 * (locked once saved, the server refuses an owner's change). While the venue
 * is still being registered the number belongs to the Documents section,
 * beside its certificate, so this only points there.
 */
export default function FoodGstinField({ control, mode, savedGstin }: Readonly<Props>) {
  const { t } = useTranslation();

  if (!savedGstin && mode !== 'edit-approved') {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="register-venue-food-gstin-documents">
        {t('partners.registerVenuePage.foodGstinInDocuments')}
      </Typography>
    );
  }

  return (
    <SharedFoodGstinField
      control={control}
      name="food_gstin"
      savedGstin={savedGstin}
      mode="owner"
      idPrefix="register-venue"
    />
  );
}
