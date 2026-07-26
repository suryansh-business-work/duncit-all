import { createDateFormatter, stampServerTime, toTimeSource } from '@duncit/datetime';
import type { DateFormatter } from '@duncit/datetime';

import { useAppSettingsStore } from '@/stores/app-settings.store';

/**
 * The app's date/time formatter, built from the admin's display settings.
 *
 * Read straight off the zustand store rather than through a hook so the plain
 * `formatDate`/`formatDateTime` helpers stay plain functions — every existing
 * call site becomes admin-driven without being rewritten. `useDateFormat()`
 * wraps the same builder for components that must re-render when settings land.
 *
 * Mobile formats in the admin's IANA zone (timeZoneAware), matching mWeb, so a
 * pod at 6pm IST reads 6pm on both surfaces regardless of device zone.
 */
type AppSettingsSnapshot = NonNullable<
  ReturnType<typeof useAppSettingsStore.getState>['data']
>['publicAppSettings'];

export function appFormatter(snapshot?: AppSettingsSnapshot | null): DateFormatter {
  const settings = snapshot ?? useAppSettingsStore.getState().data?.publicAppSettings;
  const serverTime = settings?.server_time ?? null;
  return createDateFormatter({
    dateFormat: settings?.date_format,
    timeFormat: settings?.time_format,
    timeZone: settings?.time_zone,
    timeZoneAware: true,
    clock: {
      source: toTimeSource(settings?.time_source),
      serverNow: serverTime,
      serverNowReceivedAt: stampServerTime(serverTime),
      customTime: settings?.custom_time ?? null,
      customTimeSetAt: settings?.custom_time_set_at ?? null,
    },
  });
}

/** The application clock's current instant — never `new Date()` directly, so
 * an admin's custom time moves every relative label too. */
export function appNow(): Date {
  return appFormatter().now();
}
