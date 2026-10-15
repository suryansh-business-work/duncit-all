import { Controller, type FieldValues, type Path } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { FOOD_LIQUOR_LICENCE_MAX } from '@duncit/forms/schemas';
import type { VenueFoodLicences } from '@duncit/utils';
import type { FoodPhotoUpload } from './FoodDishPhotos';
import type { FoodControlProps } from './food-paths';
import LicenceDocumentField from './LicenceDocumentField';

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  upload: FoodPhotoUpload;
  idPrefix: string;
}

const FSSAI_LENGTH = 14;

const licencePath = <T extends FieldValues>(field: keyof VenueFoodLicences) => `food_licences.${field}` as Path<T>;

/**
 * The FSSAI licence (its number is printed at the foot of the public menu and
 * on food invoices) and the optional liquor licence, each with an optional
 * uploaded document that only the owner and Duncit see.
 */
export default function FoodLicenceFields<T extends FieldValues, TOut = T>({ control, upload, idPrefix }: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const documents = [
    { field: 'fssai_document_url', name: t('venueFoodOwner.licences.fssaiDocument') },
    { field: 'liquor_document_url', name: t('venueFoodOwner.licences.liquorDocument') },
  ] as const;

  return (
    <Stack spacing={1.5} data-testid={`${idPrefix}-food-licences`}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('venueFoodOwner.licences.title')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.licences.intro')}
        </Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <RhfTextField
          control={control}
          name={licencePath<T>('fssai_number')}
          label={t('venueFoodOwner.licences.fssai')}
          hint={t('venueFoodOwner.licences.fssaiHint')}
          size="small"
          slotProps={{ htmlInput: { maxLength: FSSAI_LENGTH, inputMode: 'numeric', 'data-testid': `${idPrefix}-food-fssai` } }}
        />
        <RhfTextField
          control={control}
          name={licencePath<T>('liquor_licence_number')}
          label={t('venueFoodOwner.licences.liquor')}
          size="small"
          slotProps={{ htmlInput: { maxLength: FOOD_LIQUOR_LICENCE_MAX, 'data-testid': `${idPrefix}-food-liquor` } }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {documents.map(({ field, name }) => (
          <Controller
            key={field}
            name={licencePath<T>(field)}
            control={control}
            render={({ field: { value, onChange } }) => (
              <LicenceDocumentField
                name={name}
                value={typeof value === 'string' ? value : ''}
                onChange={onChange}
                venueId={upload.venueId}
                surface={upload.surface}
                testId={`${idPrefix}-food-${field}`}
              />
            )}
          />
        ))}
      </Stack>
    </Stack>
  );
}
