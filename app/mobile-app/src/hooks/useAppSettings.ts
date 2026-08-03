import { useEffect } from 'react';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS } from '@duncit/datetime';

import { useAppSettingsStore } from '@/stores/app-settings.store';

const FALLBACK_DATE = 'dd MMM yyyy';
const FALLBACK_TIME = 'hh:mm a';
const FALLBACK_ZONE = 'Asia/Kolkata';
const FALLBACK_DRAFT_RETENTION_DAYS = 3;

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
    /** Admin-configured minimum joining age — every DOB input gates on it. */
    minSignupAge: data?.publicAppSettings?.min_signup_age ?? DEFAULT_MIN_ACCOUNT_AGE_YEARS,
    draftRetentionDays:
      data?.publicAppSettings?.draft_retention_days ?? FALLBACK_DRAFT_RETENTION_DAYS,
  };
}
