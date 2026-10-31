import { useFieldArray, useFormState, type Control } from 'react-hook-form';
import { FormHelperText, IconButton, MenuItem, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { MIN_BUSINESS_MODELS, nextMinBusinessRow, type BookingOffersValues } from '@duncit/forms/schemas';
import { VENUE_MIN_BUSINESS_KEY } from '@duncit/utils';

interface Props {
  control: Control<BookingOffersValues>;
  /** Prefixes the test ids. */
  idPrefix: string;
  disabled?: boolean;
}

/**
 * The business a venue hopes each booking brings, as rows — a basis (per guest,
 * per hour, per booking) and an amount — at least one, each basis once (the
 * rules are `makeBookingOffersSchema`'s). Rows are added up to one per basis and
 * removed down to one. Hosts see these on Create Pod's offer step, and an offer
 * below the amount on its basis cannot be sent. The Partners console and mWeb draw
 * these; the native app has its Tamagui twin.
 */
export default function MinBusinessFields({ control, idPrefix, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'min_business' });
  const { errors } = useFormState({ control, name: 'min_business' });
  // Only a list with no rows at all fails as a whole (the resolver sets it on the list itself).
  const listError = errors.min_business?.message;

  return (
    <Stack spacing={1.25} data-testid={`${idPrefix}-min-business`}>
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
        {t('availability.offers.minBusiness.title')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('availability.offers.minBusiness.intro')}
      </Typography>
      {fields.map((row, index) => (
        <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }} data-testid={`${idPrefix}-min-business-row-${index}`}>
          <RhfTextField
            control={control}
            name={`min_business.${index}.model`}
            select
            label={t('availability.offers.minBusiness.basis')}
            disabled={disabled}
            sx={{ minWidth: 140 }}
          >
            {MIN_BUSINESS_MODELS.map((model) => (
              <MenuItem key={model} value={model}>
                {t(VENUE_MIN_BUSINESS_KEY[model].label)}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField
            control={control}
            name={`min_business.${index}.amount`}
            type="number"
            label={t('availability.offers.minBusiness.amount')}
            disabled={disabled}
            slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }}
          />
          <IconButton
            aria-label={t('availability.offers.minBusiness.remove')}
            onClick={() => remove(index)}
            disabled={disabled || fields.length === 1}
            sx={{ mt: 1 }}
            data-testid={`${idPrefix}-min-business-remove-${index}`}
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </Stack>
      ))}
      {listError && <FormHelperText error>{listError}</FormHelperText>}
      {fields.length < MIN_BUSINESS_MODELS.length && (
        <DuncitButton
          variant="outlined"
          startIcon={<AddRoundedIcon />}
          onClick={() => append(nextMinBusinessRow(fields))}
          disabled={disabled}
          sx={{ alignSelf: 'flex-start' }}
          data-testid={`${idPrefix}-min-business-add`}
        >
          {t('availability.offers.minBusiness.add')}
        </DuncitButton>
      )}
    </Stack>
  );
}
