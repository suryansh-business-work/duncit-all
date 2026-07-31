import type { Option } from '../helpers';

/** Filter dropdown values that come from data, plus the admin date format. */
export interface AudienceColumnDeps {
  roleOptions: Option[];
  interestOptions: Option[];
  countryOptions: Option[];
  stateOptions: Option[];
  cityOptions: Option[];
  zoneOptions: Option[];
  /** The admin-configured date/time formatter (rule 11). */
  formatDate: (date: Date) => string;
}
