import { allCountries } from 'country-region-data';

export interface GeoCountry {
  name: string;
  isoCode: string;
  flag: string;
}

export interface GeoState {
  name: string;
  isoCode: string;
  countryCode: string;
}

export interface GeoCity {
  name: string;
  countryCode: string;
  stateCode: string;
}

const byName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const flagForIso = (isoCode: string) =>
  isoCode
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + (letter.codePointAt(0) ?? 0)));

const countries = byName(
  allCountries.map(([name, isoCode]) => ({
    name,
    isoCode,
    flag: flagForIso(isoCode),
  }))
);

export const COUNTRY_OPTIONS: GeoCountry[] = [
  ...countries.filter((country) => country.isoCode === 'IN'),
  ...countries.filter((country) => country.isoCode !== 'IN'),
];

export const getStatesForCountry = (countryCode?: string) => {
  const country = allCountries.find(([, isoCode]) => isoCode === countryCode);
  return country
    ? byName(country[2].map(([name, isoCode]) => ({ name, isoCode, countryCode: country[1] })))
    : [];
};

export const getCitiesForState = (_countryCode?: string, _stateCode?: string): GeoCity[] => [];

export const findCountry = (countryCode?: string) =>
  COUNTRY_OPTIONS.find((country) => country.isoCode === countryCode);

export const findState = (countryCode?: string, stateCode?: string, stateName?: string) =>
  getStatesForCountry(countryCode).find(
    (state) => state.isoCode === stateCode || state.name === stateName
  );

export const findCity = (countryCode?: string, stateCode?: string, cityName?: string) =>
  getCitiesForState(countryCode, stateCode).find((city) => city.name === cityName);