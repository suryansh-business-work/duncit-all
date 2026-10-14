import type { UseFormReturn } from 'react-hook-form';
import { Stack, TextField, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { RegisterVenueMode, RegisterVenueValues } from '../../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  mode: RegisterVenueMode;
  /** The GST number the venue already has; '' when none. */
  savedGstin: string;
}

/**
 * The GST number printed on the venue's food invoices.
 *
 * A saved one is shown read-only: only Duncit changes it (the server refuses
 * the owner). An approved venue without one may enter it here, once. While the
 * venue is still being registered the number belongs to the Documents section,
 * beside its certificate, so this only points there.
 */
export default function FoodGstinField({ form, mode, savedGstin }: Readonly<Props>) {
  const { t } = useTranslation();

  if (savedGstin) {
    return (
      <TextField
        label={t('shell.foodTax.gstin')}
        value={savedGstin}
        size="small"
        helperText={t('shell.foodTax.gstinLocked')}
        slotProps={{ htmlInput: { readOnly: true, 'aria-readonly': true } }}
        sx={{ maxWidth: 320 }}
        data-testid="register-venue-food-gstin-locked"
      />
    );
  }

  if (mode !== 'edit-approved') {
    return (
      <Stack data-testid="register-venue-food-gstin-documents">
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.registerVenuePage.foodGstinInDocuments')}
        </Typography>
      </Stack>
    );
  }

  return (
    <RhfTextField
      control={form.control}
      name="food_gstin"
      label={t('shell.foodTax.gstin')}
      hint={t('shell.foodTax.gstinHint')}
      size="small"
      fullWidth={false}
      sx={{ maxWidth: 320 }}
      slotProps={{ htmlInput: { maxLength: 15, autoCapitalize: 'characters' } }}
      data-testid="register-venue-food-gstin"
    />
  );
}
