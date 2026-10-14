import type { FieldValues, Path } from 'react-hook-form';
import { TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import type { FoodMenuMode } from '@duncit/utils';
import type { FoodControlProps } from './food-paths';

/** The longest GST number — 15 characters, as the server stores it. */
const GSTIN_LENGTH = 15;

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  /** Where the form holds the typed number (`gstin` in the menu editor, `food_gstin` in the venue form). */
  name: Path<T>;
  /** The number the venue already has; '' when none. */
  savedGstin: string;
  mode: FoodMenuMode;
  idPrefix: string;
}

/**
 * The GST number printed on the venue's food invoices. An owner gives it once:
 * a saved one is shown read-only (the server refuses a change from the owner).
 * A Venues console editor may always change it.
 */
export default function FoodGstinField<T extends FieldValues, TOut = T>({
  control,
  name,
  savedGstin,
  mode,
  idPrefix,
}: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();

  if (mode === 'owner' && savedGstin) {
    return (
      <TextField
        label={t('shell.foodTax.gstin')}
        value={savedGstin}
        size="small"
        helperText={t('shell.foodTax.gstinLocked')}
        slotProps={{ htmlInput: { readOnly: true, 'aria-readonly': true } }}
        sx={{ maxWidth: 320 }}
        data-testid={`${idPrefix}-food-gstin-locked`}
      />
    );
  }

  return (
    <RhfTextField
      control={control}
      name={name}
      label={t('shell.foodTax.gstin')}
      hint={mode === 'admin' ? t('venueFoodOwner.menu.gstinAdminHint') : t('shell.foodTax.gstinHint')}
      size="small"
      fullWidth={false}
      sx={{ maxWidth: 320 }}
      slotProps={{ htmlInput: { maxLength: GSTIN_LENGTH, autoCapitalize: 'characters' } }}
      data-testid={`${idPrefix}-food-gstin`}
    />
  );
}
