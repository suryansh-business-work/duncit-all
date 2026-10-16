import { useId } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { FormHelperText, FormLabel, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitRichTextInput } from '@duncit/rich-text';
import type { RentalItemsValues } from '@duncit/utils';
import type { RentalItemsOutput } from '@duncit/forms/schemas';

interface Props {
  control: Control<RentalItemsValues, unknown, RentalItemsOutput>;
}

/** The venue's own rental terms — shown to every renter beside Duncit's. */
export default function RentalTermsField({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const labelId = useId();
  return (
    <Controller
      control={control}
      name="rental_terms_html"
      render={({ field, fieldState }) => (
        <Stack spacing={0.75} role="group" aria-labelledby={labelId}>
          <FormLabel id={labelId}>{t('venueRentals.items.terms')}</FormLabel>
          <DuncitRichTextInput
            value={field.value ?? ''}
            onChange={(html) => field.onChange(html)}
            ariaLabel={t('venueRentals.items.terms')}
            aiContext={t('venueRentals.items.termsAiContext')}
            imageFolder="/venues"
            minHeight={140}
          />
          <FormHelperText error={Boolean(fieldState.error)}>
            {fieldState.error?.message ?? t('venueRentals.items.termsHint')}
          </FormHelperText>
        </Stack>
      )}
    />
  );
}
