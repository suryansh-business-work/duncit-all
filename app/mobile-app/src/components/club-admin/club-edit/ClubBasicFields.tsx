import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import type { ClubEditFormHandle } from './club-edit.form';
import { ClubCategoryField } from './ClubCategoryField';
import { ClubLocationField } from './ClubLocationField';

interface Props {
  form: ClubEditFormHandle;
}

/**
 * The club's Basic information — its name, its description, and the two picks
 * that decide which approved venues auto-match it. The same four things
 * @duncit/club-form's `BasicSection` renders on mWeb and in the Partners
 * console (rule 27).
 *
 * Both pickers write TWO form fields at once, so they sit outside `Controller`
 * and write through `setValue` — the shape the MUI section uses for the same
 * reason.
 */
export function ClubBasicFields({ form }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, setValue, watch, formState } = form;
  const { errors } = formState;

  const setCategory = (superId: string, subId: string) => {
    setValue('super_category_id', superId, { shouldDirty: true, shouldValidate: true });
    setValue('category_id', subId, { shouldDirty: true, shouldValidate: true });
  };
  const setLocation = (locationId: string, locality: string) => {
    setValue('location_id', locationId, { shouldDirty: true, shouldValidate: true });
    setValue('locality', locality, { shouldDirty: true });
  };

  return (
    <YStack gap={14}>
      <FormTextField
        control={control}
        name="club_name"
        label={t('clubForm.basicSection.clubName')}
        required
      />
      <FormTextField
        control={control}
        name="club_description"
        label={t('clubForm.common.description')}
        multiline
        required
      />
      <ClubCategoryField
        superId={watch('super_category_id')}
        subId={watch('category_id')}
        onChange={setCategory}
        superError={errors.super_category_id?.message}
        subError={errors.category_id?.message}
      />
      <ClubLocationField
        locationId={watch('location_id')}
        locality={watch('locality')}
        onChange={setLocation}
        error={errors.location_id?.message}
      />
    </YStack>
  );
}
