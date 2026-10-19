import { useMemo, useState } from 'react';
import { useTranslation } from '@duncit/app-settings';
import {
  AdminLocationSelect,
  EMPTY_LOCATION,
  buildLocationValue,
  useAdminLocations,
  type AdminLocationValue,
} from '@duncit/location';

/** The slice of a react-hook-form field this needs — `useController(...).field` fits. */
interface FieldBinding {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

interface Props {
  /** The fieldset's legend — "City" on a post and on a freelancer profile. */
  legend: string;
  /** The form's `location_id` field: an admin Location id, '' for none. */
  city: FieldBinding;
  /** The form's `locality` field: one of that city's zones, '' for the whole city. */
  area: FieldBinding;
  error?: string;
}

/**
 * Country › State › City › Area from the admin Location list — the picker pods
 * and clubs use — for a gig post and a freelancer profile. The form keeps only
 * `location_id` + `locality`; the levels above the city live in a draft, as in
 * the club editor, because a saved city rebuilds them from its Location.
 * `required` is left off on purpose: the picker would star every level, and
 * the area is optional — a missing city is reported by the schema instead.
 * Native twin: GigPlaceField.
 */
export default function GigPlaceField({ legend, city, area, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const { locations } = useAdminLocations();
  const [draft, setDraft] = useState<AdminLocationValue>(EMPTY_LOCATION);
  const value = useMemo(
    () => (city.value ? buildLocationValue(locations, city.value, area.value) : draft),
    [locations, city.value, area.value, draft],
  );

  return (
    <AdminLocationSelect
      value={value}
      onChange={(next) => {
        setDraft(next);
        city.onChange(next.location_id);
        area.onChange(next.locality);
        // Marks the city touched so the form re-validates it.
        city.onBlur();
      }}
      legend={legend}
      labels={{ locality: t('gigJobs.form.locality') }}
      errors={error ? { city: error } : undefined}
    />
  );
}
