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
/** Every country (alphabetical), India pinned first for our India-heavy base. */
export declare const COUNTRY_OPTIONS: GeoCountry[];
/** States/regions for a country ISO code (empty when unknown), alphabetical. */
export declare const getStatesForCountry: (countryCode?: string) => GeoState[];
/** Look up a country by its display name — the profile stores names, not codes. */
export declare const findCountryByName: (name?: string) => GeoCountry | undefined;
