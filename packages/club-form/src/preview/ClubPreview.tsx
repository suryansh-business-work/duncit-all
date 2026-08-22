import { useFormContext, useWatch } from 'react-hook-form';
import { buildCategoryValue, useAdminCategories } from '@duncit/category';
import { buildLocationValue, useAdminLocations } from '@duncit/location';
import { buildClubPreview } from './club-preview-model';
import ClubPreviewCard from './ClubPreviewCard';
import ClubPreviewDetails from './ClubPreviewDetails';
import PreviewPane from './PreviewPane';
import type { ClubFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Live member-side preview of the club being written. Rendered INSIDE the
 * form's provider, so it re-derives on every keystroke from the same values the
 * save button will submit.
 *
 * Category and location are ids in the form; the shared datasets that name them
 * are the same ones the Basic section's cascade pickers already read.
 */
export default function ClubPreview() {
  const { t } = useTranslation();
  const { control, getValues } = useFormContext<ClubFormValues>();
  const { categories } = useAdminCategories();
  const { locations } = useAdminLocations();
  // Subscribing to the whole form is the point: any field can change what the
  // card or the page shows. `getValues` then reads the complete shape, which
  // `useWatch`'s partial return type cannot promise on its own.
  useWatch({ control });
  const values = getValues();

  const category = buildCategoryValue(categories, values.super_category_id, values.category_id);
  const location = buildLocationValue(locations, values.location_id, values.locality);
  const model = buildClubPreview(values, {
    categoryText: [category.super_name, category.sub_name].filter(Boolean).join(' · '),
    placeText: [location.locality, location.city, location.state].filter(Boolean).join(', '),
  });

  return (
    <PreviewPane
      title={t('clubForm.preview.memberPreview')}
      hint="How this club will look once it is live. Nothing here is saved yet."
      blocks={[
        { id: 'card', label: t('clubForm.preview.inTheClubsList'), node: <ClubPreviewCard model={model} /> },
        { id: 'details', label: t('clubForm.preview.onTheClubPage'), node: <ClubPreviewDetails model={model} /> },
      ]}
    />
  );
}
