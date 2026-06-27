// Country dialing codes for the phone/WhatsApp country-code pickers. Reference
// configuration (not business data) — mirrored 1:1 in the mobile app so both
// experiences offer the identical searchable list. `iso2` drives the flag image
// (via flagcdn, matching location-tree.countryFlagUrl).

export interface CountryCode {
  name: string;
  iso2: string;
  dial: string;
}

/** India first (the default market), then alphabetical by country name. */
export const COUNTRY_CODES: CountryCode[] = [
  { name: 'India', iso2: 'in', dial: '+91' },
  { name: 'Afghanistan', iso2: 'af', dial: '+93' },
  { name: 'Australia', iso2: 'au', dial: '+61' },
  { name: 'Austria', iso2: 'at', dial: '+43' },
  { name: 'Bangladesh', iso2: 'bd', dial: '+880' },
  { name: 'Belgium', iso2: 'be', dial: '+32' },
  { name: 'Bhutan', iso2: 'bt', dial: '+975' },
  { name: 'Brazil', iso2: 'br', dial: '+55' },
  { name: 'Canada', iso2: 'ca', dial: '+1' },
  { name: 'China', iso2: 'cn', dial: '+86' },
  { name: 'Denmark', iso2: 'dk', dial: '+45' },
  { name: 'Egypt', iso2: 'eg', dial: '+20' },
  { name: 'Finland', iso2: 'fi', dial: '+358' },
  { name: 'France', iso2: 'fr', dial: '+33' },
  { name: 'Germany', iso2: 'de', dial: '+49' },
  { name: 'Greece', iso2: 'gr', dial: '+30' },
  { name: 'Hong Kong', iso2: 'hk', dial: '+852' },
  { name: 'Indonesia', iso2: 'id', dial: '+62' },
  { name: 'Iran', iso2: 'ir', dial: '+98' },
  { name: 'Iraq', iso2: 'iq', dial: '+964' },
  { name: 'Ireland', iso2: 'ie', dial: '+353' },
  { name: 'Israel', iso2: 'il', dial: '+972' },
  { name: 'Italy', iso2: 'it', dial: '+39' },
  { name: 'Japan', iso2: 'jp', dial: '+81' },
  { name: 'Kenya', iso2: 'ke', dial: '+254' },
  { name: 'Kuwait', iso2: 'kw', dial: '+965' },
  { name: 'Malaysia', iso2: 'my', dial: '+60' },
  { name: 'Maldives', iso2: 'mv', dial: '+960' },
  { name: 'Mexico', iso2: 'mx', dial: '+52' },
  { name: 'Nepal', iso2: 'np', dial: '+977' },
  { name: 'Netherlands', iso2: 'nl', dial: '+31' },
  { name: 'New Zealand', iso2: 'nz', dial: '+64' },
  { name: 'Nigeria', iso2: 'ng', dial: '+234' },
  { name: 'Norway', iso2: 'no', dial: '+47' },
  { name: 'Oman', iso2: 'om', dial: '+968' },
  { name: 'Pakistan', iso2: 'pk', dial: '+92' },
  { name: 'Philippines', iso2: 'ph', dial: '+63' },
  { name: 'Poland', iso2: 'pl', dial: '+48' },
  { name: 'Portugal', iso2: 'pt', dial: '+351' },
  { name: 'Qatar', iso2: 'qa', dial: '+974' },
  { name: 'Russia', iso2: 'ru', dial: '+7' },
  { name: 'Saudi Arabia', iso2: 'sa', dial: '+966' },
  { name: 'Singapore', iso2: 'sg', dial: '+65' },
  { name: 'South Africa', iso2: 'za', dial: '+27' },
  { name: 'South Korea', iso2: 'kr', dial: '+82' },
  { name: 'Spain', iso2: 'es', dial: '+34' },
  { name: 'Sri Lanka', iso2: 'lk', dial: '+94' },
  { name: 'Sweden', iso2: 'se', dial: '+46' },
  { name: 'Switzerland', iso2: 'ch', dial: '+41' },
  { name: 'Thailand', iso2: 'th', dial: '+66' },
  { name: 'Turkey', iso2: 'tr', dial: '+90' },
  { name: 'Ukraine', iso2: 'ua', dial: '+380' },
  { name: 'United Arab Emirates', iso2: 'ae', dial: '+971' },
  { name: 'United Kingdom', iso2: 'gb', dial: '+44' },
  { name: 'United States', iso2: 'us', dial: '+1' },
  { name: 'Vietnam', iso2: 'vn', dial: '+84' },
];

/** First country whose dial code matches (US/Canada share +1 — US wins). */
export function countryByDial(dial: string): CountryCode | undefined {
  const value = dial.trim();
  return COUNTRY_CODES.find((c) => c.dial === value);
}
