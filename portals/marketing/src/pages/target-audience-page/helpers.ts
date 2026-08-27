import type { LocationDoc } from '@duncit/location';

/** One targetable person, as `audienceTable` returns them. */
export interface AudienceRow {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  city?: string | null;
  state?: string | null;
  zone?: string | null;
  pincode?: string | null;
  country?: string | null;
  locale?: string | null;
  status?: string | null;
  roles: string[];
  email_verified: boolean;
  phone_verified: boolean;
  whatsapp_reachable: boolean;
  push_platforms: string[];
  last_login_provider?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
}

/** One saved criterion, as stored on a list. */
export interface AudienceListFilterRow {
  field: string;
  op: string;
  value?: string | null;
  values: string[];
}

/** A saved Target Audience list. Stores criteria, not people, so member_count
 * is recomputed by the server every time it is read — the criteria plus anyone
 * added by hand, minus anyone removed by hand. */
export interface AudienceListRow {
  id: string;
  name: string;
  description: string;
  owner: string;
  owner_user_id?: string | null;
  search: string;
  /** How many people were added to the list by hand. */
  manual_member_count: number;
  /** How many people were taken out of the list by hand. */
  excluded_member_count: number;
  member_count: number;
  filters: AudienceListFilterRow[];
  created_at?: string | null;
}

export interface Option {
  value: string;
  label: string;
}

/** Filter dropdowns whose values are a fixed part of the data model. Anything
 * that varies with the data (roles, interests, locations) is fetched. */
export const STATUS_OPTIONS: Option[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export const PROVIDER_OPTIONS: Option[] = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'GOOGLE', label: 'Google' },
];

/**
 * Push reachability, not device ownership. A row exists only while somebody has
 * granted push and stayed signed in, so this answers "can I push to them right
 * now", which is the question a campaign actually asks.
 */
export const PUSH_OPTIONS: Option[] = [
  { value: 'ANY', label: 'Any platform' },
  { value: 'ANDROID', label: 'Android' },
  { value: 'IOS', label: 'iOS' },
  { value: 'WEB', label: 'Web' },
  { value: 'NONE', label: 'Not reachable' },
];

export const VISIBILITY_OPTIONS: Option[] = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PRIVATE', label: 'Private' },
];

const byLabel = (a: Option, b: Option) => a.label.localeCompare(b.label);

const distinct = (values: (string | null | undefined)[]): Option[] => {
  const seen = new Set<string>();
  for (const value of values) {
    if (value) seen.add(value);
  }
  return [...seen].map((value) => ({ value, label: value })).sort(byLabel);
};

/**
 * Location dropdowns from the admin-managed Location tree. The user document
 * stores the country/state/city/zone as NAMES, so the option values are names
 * too — matching on ids here would filter on something nobody stores.
 */
export function locationOptions(locations: LocationDoc[]) {
  return {
    country: distinct(locations.map((l) => l.country)),
    state: distinct(locations.map((l) => l.state)),
    city: distinct(locations.map((l) => l.city)),
    zone: distinct(locations.flatMap((l) => (l.location_zones ?? []).map((z) => z.zone_name))),
  };
}

export const toOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: value }));
