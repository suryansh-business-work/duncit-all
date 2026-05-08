// Country list with flag emoji + ISO + dial code (mirror of mweb-app/src/utils/countries.ts).
export interface Country {
  name: string;
  iso: string;
  dial: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: 'India', iso: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'Afghanistan', iso: 'AF', dial: '+93', flag: '🇦🇫' },
  { name: 'Australia', iso: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Bangladesh', iso: 'BD', dial: '+880', flag: '🇧🇩' },
  { name: 'Bhutan', iso: 'BT', dial: '+975', flag: '🇧🇹' },
  { name: 'Brazil', iso: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'Canada', iso: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'China', iso: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'France', iso: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Germany', iso: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'Hong Kong', iso: 'HK', dial: '+852', flag: '🇭🇰' },
  { name: 'Indonesia', iso: 'ID', dial: '+62', flag: '🇮🇩' },
  { name: 'Italy', iso: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Japan', iso: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'Malaysia', iso: 'MY', dial: '+60', flag: '🇲🇾' },
  { name: 'Maldives', iso: 'MV', dial: '+960', flag: '🇲🇻' },
  { name: 'Mexico', iso: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Nepal', iso: 'NP', dial: '+977', flag: '🇳🇵' },
  { name: 'Netherlands', iso: 'NL', dial: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', iso: 'NZ', dial: '+64', flag: '🇳🇿' },
  { name: 'Pakistan', iso: 'PK', dial: '+92', flag: '🇵🇰' },
  { name: 'Philippines', iso: 'PH', dial: '+63', flag: '🇵🇭' },
  { name: 'Qatar', iso: 'QA', dial: '+974', flag: '🇶🇦' },
  { name: 'Russia', iso: 'RU', dial: '+7', flag: '🇷🇺' },
  { name: 'Saudi Arabia', iso: 'SA', dial: '+966', flag: '🇸🇦' },
  { name: 'Singapore', iso: 'SG', dial: '+65', flag: '🇸🇬' },
  { name: 'South Africa', iso: 'ZA', dial: '+27', flag: '🇿🇦' },
  { name: 'South Korea', iso: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'Spain', iso: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Sri Lanka', iso: 'LK', dial: '+94', flag: '🇱🇰' },
  { name: 'Sweden', iso: 'SE', dial: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', iso: 'CH', dial: '+41', flag: '🇨🇭' },
  { name: 'Thailand', iso: 'TH', dial: '+66', flag: '🇹🇭' },
  { name: 'Turkey', iso: 'TR', dial: '+90', flag: '🇹🇷' },
  { name: 'United Arab Emirates', iso: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom', iso: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'United States', iso: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Vietnam', iso: 'VN', dial: '+84', flag: '🇻🇳' },
];

export const findCountryByDial = (dial: string): Country | undefined =>
  COUNTRIES.find((c) => c.dial === dial);
