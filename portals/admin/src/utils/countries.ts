import { countries } from 'countries-list';

export interface Country {
  name: string;
  iso: string;
  dial: string;
  flag: string;
}

const normalizeDial = (phonecode?: string | number) => {
  const cleaned = String(phonecode ?? '').trim().replace(/^\+/, '');
  return cleaned ? `+${cleaned}` : '';
};

const flagForIso = (iso: string) =>
  iso
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + (letter.codePointAt(0) ?? 0)));

const allCountries = Object.entries(countries)
  .map(([iso, country]) => ({
    name: country.name,
    iso,
    dial: normalizeDial(country.phone?.[0]),
    flag: flagForIso(iso),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const COUNTRIES: Country[] = [
  ...allCountries.filter((country) => country.iso === 'IN'),
  ...allCountries.filter((country) => country.iso !== 'IN'),
];

export const findCountryByDial = (dial: string): Country | undefined =>
  COUNTRIES.find((country) => country.dial === dial);

export const findCountryByIso = (iso: string): Country | undefined =>
  COUNTRIES.find((country) => country.iso === iso.toUpperCase());
