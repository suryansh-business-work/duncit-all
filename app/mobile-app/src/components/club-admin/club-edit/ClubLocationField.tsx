import { LocationPickerField } from '@/components/LocationPickerField/LocationPickerField';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The club's city — a Location document id. */
  locationId: string;
  /** The area of that city the club operates in, or '' for the whole city. */
  locality: string;
  onChange: (locationId: string, locality: string) => void;
  /** Why the city is invalid, or undefined. The area is optional, as on mWeb. */
  error?: string;
}

/**
 * Country › State › City › Locality for the club editor — the Tamagui twin of
 * the `AdminLocationSelect` cascade @duncit/club-form renders on mWeb and in
 * the Partners console (rule 27), drawn by the shared `LocationPickerField`.
 */
export function ClubLocationField({ locationId, locality, onChange, error }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <LocationPickerField
      locationId={locationId}
      locality={locality}
      onChange={onChange}
      error={error}
      required
      testID="club-edit"
      copy={{
        label: t('clubForm.basicSection.location'),
        hint: t('clubForm.basicSection.locationHint'),
        placeholder: t('clubForm.basicSection.cityPlaceholder'),
        change: t('clubForm.basicSection.changeCity'),
        cityAria: (city) => t('clubForm.basicSection.cityAria', { vars: { city } }),
        locality: t('clubForm.basicSection.locality'),
        anyLocality: t('clubForm.basicSection.anyLocality'),
        noLocalities: t('clubForm.basicSection.noLocalities'),
      }}
    />
  );
}
