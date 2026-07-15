"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCountryByName = exports.getStatesForCountry = exports.COUNTRY_OPTIONS = void 0;
const country_region_data_1 = require("country-region-data");
const byName = (items) => [...items].sort((a, b) => a.name.localeCompare(b.name));
/** Emoji flag for an ISO-3166 alpha-2 code by mapping A–Z to regional indicators. */
const flagForIso = (isoCode) => isoCode
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + (letter.codePointAt(0) ?? 0)));
const countries = byName(country_region_data_1.allCountries.map(([name, isoCode]) => ({ name, isoCode, flag: flagForIso(isoCode) })));
/** Every country (alphabetical), India pinned first for our India-heavy base. */
exports.COUNTRY_OPTIONS = [
    ...countries.filter((country) => country.isoCode === 'IN'),
    ...countries.filter((country) => country.isoCode !== 'IN'),
];
/** States/regions for a country ISO code (empty when unknown), alphabetical. */
const getStatesForCountry = (countryCode) => {
    const country = country_region_data_1.allCountries.find(([, isoCode]) => isoCode === countryCode);
    return country
        ? byName(country[2].map(([name, isoCode]) => ({ name, isoCode, countryCode: country[1] })))
        : [];
};
exports.getStatesForCountry = getStatesForCountry;
/** Look up a country by its display name — the profile stores names, not codes. */
const findCountryByName = (name) => name ? exports.COUNTRY_OPTIONS.find((country) => country.name === name) : undefined;
exports.findCountryByName = findCountryByName;
