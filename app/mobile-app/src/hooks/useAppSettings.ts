import { useEffect } from 'react';

import { useAppSettingsStore } from '@/stores/app-settings.store';

const FALLBACK_DATE = 'dd MMM yyyy';
const FALLBACK_TIME = 'hh:mm a';
const FALLBACK_ZONE = 'Asia/Kolkata';

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
  };
}
