import { LocationPickerField } from '@/components/LocationPickerField/LocationPickerField';
import { useTranslation } from '@/hooks/useTranslation';

/** The slice of a react-hook-form field this needs — `useController(...).field` fits. */
interface FieldBinding {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

interface Props {
  label: string;
  /** The form's `location_id` field. */
  city: FieldBinding;
  /** The form's `locality` field. */
  area: FieldBinding;
  error?: string;
  testID: string;
}

/**
 * The city (and optional area) of a gig post or a freelancer profile, picked
 * from the admin Location list. A new city writes both fields at once, then
 * marks the city touched so the form re-validates it.
 * mWeb twin: @duncit/gig-jobs GigPlaceField.
 */
export function GigPlaceField({ label, city, area, error, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <LocationPickerField
      locationId={city.value}
      locality={area.value}
      onChange={(locationId, locality) => {
        city.onChange(locationId);
        area.onChange(locality);
        city.onBlur();
      }}
      error={error}
      required
      testID={testID}
      copy={{
        label,
        placeholder: t('gigJobs.form.cityPlaceholder'),
        change: t('gigJobs.form.changeCity'),
        cityAria: (name) => t('gigJobs.form.cityAria', { vars: { city: name } }),
        locality: t('gigJobs.form.locality'),
        anyLocality: t('gigJobs.form.anyLocality'),
        noLocalities: t('gigJobs.form.noLocalities'),
      }}
    />
  );
}
