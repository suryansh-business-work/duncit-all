import { useMemo, useState } from 'react';
import { Stack, Switch, Typography } from '@mui/material';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import {
  AdminCategorySelect,
  buildCategoryValue,
  EMPTY_CATEGORY,
  useAdminCategories,
  type AdminCategoryValue,
  type CategoryDoc,
} from '@duncit/category';
import {
  AdminLocationSelect,
  buildLocationValue,
  EMPTY_LOCATION,
  useAdminLocations,
  type AdminLocationValue,
} from '@duncit/location';
import RhfTextField from '../components/RhfTextField';
import { useClubFormData } from '../context';
import type { ClubFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

const CATEGORY_HINT =
  'Venues auto-match to this club by location + category — pick the same Super & Sub the venues sit under.';
const LOCATION_HINT = 'Approved venues here in the same category auto-link to this club.';

/**
 * The category picker's value, DERIVED from the ids the form holds.
 *
 * It used to be plain local state seeded once per club, which meant anything
 * writing the ids straight into the form — an AI fill, most visibly — left both
 * cascades rendering empty while the form already held the value.
 *
 * `draft` carries the one level the club does not persist: the middle Category,
 * which the picker needs while a super is chosen but a sub is not. It is only
 * honoured under the super it was picked for.
 */
function categoryValueOf(
  categories: CategoryDoc[],
  superId: string,
  subId: string,
  draft: AdminCategoryValue,
): AdminCategoryValue {
  if (!superId) return draft;
  const built = buildCategoryValue(categories, superId, subId);
  if (built.category_id || draft.super_id !== superId) return built;
  return { ...built, category_id: draft.category_id, category_name: draft.category_name };
}

/** Basic club fields + the shared Category and Location cascade pickers. The
 * club persists super_category_id + category_id (sub) + location_id + locality;
 * the pickers derive their full cascade value from those ids, keeping only the
 * levels the club does not store in local state. */
export default function BasicSection() {
  const { t } = useTranslation();
  const { config } = useClubFormData();
  const { control, setValue, getValues } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });
  const clubDocId = useWatch({ control, name: 'id' });
  const isVerified = useWatch({ control, name: 'is_verified' });
  const isActive = useWatch({ control, name: 'is_active' });
  const { categories } = useAdminCategories();
  const { locations } = useAdminLocations();
  const superCategoryId = useWatch({ control, name: 'super_category_id' });
  const subCategoryId = useWatch({ control, name: 'category_id' });
  const locationId = useWatch({ control, name: 'location_id' });
  const locality = useWatch({ control, name: 'locality' });

  // What only the pickers know: the levels above the id the club stores.
  const [catDraft, setCatDraft] = useState<AdminCategoryValue>(EMPTY_CATEGORY);
  const [locDraft, setLocDraft] = useState<AdminLocationValue>(EMPTY_LOCATION);

  const catValue = useMemo(
    () => categoryValueOf(categories, superCategoryId, subCategoryId, catDraft),
    [categories, superCategoryId, subCategoryId, catDraft],
  );
  // Country and state come with the Location doc, so a stored city rebuilds the
  // whole cascade; the draft only covers stepping down to one.
  const locValue = useMemo(
    () => (locationId ? buildLocationValue(locations, locationId, locality) : locDraft),
    [locations, locationId, locality, locDraft],
  );

  const slugHint = clubDocId
    ? `URL slug: ${getValues('club_id') || '—'}`
    : 'A URL-friendly slug is auto-generated from this name';

  return (
    <Stack spacing={2}>
      <RhfTextField control={control} name="club_name" label={t('clubForm.basicSection.clubName')} required hint={slugHint} />
      <RhfTextField
        control={control}
        name="club_description"
        label={t('clubForm.common.description')}
        required
        multiline
        minRows={2}
        hint="A short intro shown at the top of the club page."
      />

      <AdminCategorySelect
        value={catValue}
        onChange={(next) => {
          setCatDraft(next);
          setValue('super_category_id', next.super_id);
          setValue('category_id', next.sub_id);
        }}
        direction="row"
        required
        legend="Category"
        hint={CATEGORY_HINT}
        errors={{ super: errors.super_category_id?.message, sub: errors.category_id?.message }}
      />

      <AdminLocationSelect
        value={locValue}
        onChange={(next) => {
          setLocDraft(next);
          setValue('location_id', next.location_id);
          setValue('locality', next.locality);
        }}
        fields={['country', 'state', 'city', 'locality']}
        direction="row"
        required
        legend="Location"
        hint={LOCATION_HINT}
        errors={{ city: errors.location_id?.message }}
      />

      {config.showVerified && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch checked={!!isVerified} onChange={(_, value) => setValue('is_verified', value)} />
          <Typography variant="body2">{isVerified ? 'Verified club' : 'Not verified'}</Typography>
        </Stack>
      )}
      {config.showIsActive && clubDocId && (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch checked={!!isActive} onChange={(_, value) => setValue('is_active', value)} />
          <Typography variant="body2">{isActive ? 'Active' : 'Inactive'}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
