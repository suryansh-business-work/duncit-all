import LocationChangeBar from '../../components/LocationChangeBar';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  cityLabel?: string;
}

/** The venue list's location row: which city the venues come from, and a Change
 * control that opens the SAME header location picker every other screen uses
 * (via its event) — applying there moves the whole app, so the list follows.
 * Native twin: VenuesLocationBar. */
export default function VenuesLocationBar({ cityLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = cityLabel
    ? t('mweb.venues.locationIn', { vars: { city: cityLabel } })
    : t('mweb.venues.locationAll');

  return (
    <LocationChangeBar
      testId="venues-location-bar"
      ariaLabel={t('mweb.venues.changeAria')}
      label={label}
      changeLabel={t('mweb.venues.change')}
    />
  );
}
