import { COUNTRIES } from './data';

export interface GeoCountry {
  name: string;
  isoCode: string;
  /** Emoji flag (regional-indicator letters) — used by the web pickers. */
  flag: string;
}

export interface GeoState {
  name: string;
  isoCode: string;
  countryCode: string;
}

const byName = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

/** Emoji flag for an ISO-3166 alpha-2 code by mapping A–Z to regional indicators. */
const flagForIso = (isoCode: string): string =>
  isoCode
    .toUpperCase()
    // `codePointAt(0)` on a matched single [A-Z] char is always defined; the `?? 0`
    // is a Sonar-required (S7758) guard for its number|undefined type whose fallback
    // can never actually run, so v8 cannot cover that branch.
    /* v8 ignore next */
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + (letter.codePointAt(0) ?? 0)));

const countries: GeoCountry[] = byName(
  COUNTRIES.map(([name, isoCode]) => ({ name, isoCode, flag: flagForIso(isoCode) })),
);

/** Every country (alphabetical), India pinned first for our India-heavy base. */
export const COUNTRY_OPTIONS: GeoCountry[] = [
  ...countries.filter((country) => country.isoCode === 'IN'),
  ...countries.filter((country) => country.isoCode !== 'IN'),
];

/** States/regions for a country ISO code (empty when unknown), alphabetical. */
export const getStatesForCountry = (countryCode?: string): GeoState[] => {
  const country = COUNTRIES.find(([, isoCode]) => isoCode === countryCode);
  return country
    ? byName(country[2].map(([name, isoCode]) => ({ name, isoCode, countryCode: country[1] })))
    : [];
};

/** Look up a country by its display name — the profile stores names, not codes. */
export const findCountryByName = (name?: string): GeoCountry | undefined =>
  name ? COUNTRY_OPTIONS.find((country) => country.name === name) : undefined;
