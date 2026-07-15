import { useEffect } from 'react';

import { useAppSettingsStore } from '@/stores/app-settings.store';

const FALLBACK_DATE = 'dd MMM yyyy';
const FALLBACK_TIME = 'hh:mm a';
const FALLBACK_ZONE = 'Asia/Kolkata';
const FALLBACK_MIN_BIRTH_YEAR = 1940;
const FALLBACK_MAX_BIRTH_YEAR = 2012;

/** Admin-configured date/time display formats + IANA time zone with safe
 * fallbacks — the RN twin of mWeb's useDateFormat (rule 11). */
export function useAppSettings() {
  const data = useAppSettingsStore((s) => s.data);
  const fetch = useAppSettingsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    dateFormat: data?.publicAppSettings?.date_format || FALLBACK_DATE,
    timeFormat: data?.publicAppSettings?.time_format || FALLBACK_TIME,
    timeZone: data?.publicAppSettings?.time_zone || FALLBACK_ZONE,
    minBirthYear: data?.publicAppSettings?.min_birth_year ?? FALLBACK_MIN_BIRTH_YEAR,
    maxBirthYear: data?.publicAppSettings?.max_birth_year ?? FALLBACK_MAX_BIRTH_YEAR,
  };
}
