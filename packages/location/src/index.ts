/**
 * @duncit/location — the one common location picker.
 *
 * `AdminLocationSelect` renders a strict cascading Country → State → City →
 * Locality dropdown sourced from the admin-managed Location DB (no free-text),
 * so every form across the consoles stays in sync with admin. `RhfAdminLocation`
 * is the react-hook-form wrapper; `useLocationValueFromId` hydrates edit forms
 * that persist only a `location_id`.
 */
export { AdminLocationSelect, type AdminLocationSelectProps } from './AdminLocationSelect';
export { RhfAdminLocation } from './RhfAdminLocation';
export { useAdminLocations, ADMIN_LOCATIONS } from './queries';
export { buildLocationValue, useLocationValueFromId, buildLocationValueFromNames } from './resolve';
export {
  countryOptions,
  stateOptions,
  cityOptions,
  localityOptions,
  cityPincode,
  type Option,
  type CityOption,
  type LocalityOption,
} from './locationOptions';
export {
  EMPTY_LOCATION,
  type AdminLocationValue,
  type LocationLevel,
  type LocationDoc,
  type LocationZone,
} from './types';
