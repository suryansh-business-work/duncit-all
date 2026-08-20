import { useCallback, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import { useCategoryValue, type AdminCategoryValue } from '@duncit/category';
import { OCCURRENCES } from '@duncit/pod-form';
import { AutoPodForm, emptyAutoPodForm, type AutoPodFormValues } from '@duncit/auto-pods';
import { useTranslation } from '@duncit/app-settings';

export interface ClubAutoPodClub {
  id: string;
  club_name: string;
  super_category_id?: string | null;
  category_id?: string | null;
}

interface Props {
  open: boolean;
  club: ClubAutoPodClub | null;
  saving: boolean;
  error: string | null;
  dismissLabel: string;
  onClose: () => void;
  onSubmit: (values: AutoPodFormValues) => Promise<void>;
}

/**
 * The Club Admin's Auto Pod dialog. Same template as the admin console's, minus
 * the category cascade: a pod inherits Super + Sub from its club, and this Auto
 * Pod is already claimed for THIS club, so its category is settled before the
 * form opens. The server enforces the same thing, so the field is a read-out.
 */
export default function ClubAutoPodForm({ club, ...rest }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolved = useCategoryValue(club?.super_category_id, club?.category_id);

  // The names need the category tree; the IDs do not. Falling back to the club's
  // own ids keeps the form submittable while that query is still in flight.
  const category = useMemo<AdminCategoryValue>(
    () => ({
      ...resolved,
      super_id: resolved.super_id || (club?.super_category_id ?? ''),
      sub_id: resolved.sub_id || (club?.category_id ?? ''),
    }),
    [resolved, club]
  );

  const initialValues = useMemo<AutoPodFormValues>(
    () => ({ ...emptyAutoPodForm, category }),
    [category]
  );

  // Without a category the template can never materialize, and the form would
  // otherwise refuse to save with no field to explain why — say it here instead.
  const missing = !category.sub_id;

  const renderCategory = useCallback(
    () => (
      <TextField
        label={t('admin.autoPods.fieldSubCategory')}
        value={category.sub_name}
        helperText={
          missing ? t('admin.autoPods.clubCategoryMissing') : t('admin.autoPods.clubCategoryHint')
        }
        error={missing}
        disabled
        fullWidth
      />
    ),
    [category.sub_name, missing, t]
  );

  const hint = t('admin.autoPods.clubHint', { vars: { club: club?.club_name ?? '' } });

  return (
    <AutoPodForm
      {...rest}
      initialValues={initialValues}
      t={t}
      occurrences={OCCURRENCES}
      renderCategory={renderCategory}
      hint={hint}
    />
  );
}
