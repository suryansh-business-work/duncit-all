import { useEffect } from 'react';
import type { DateFormatter } from '@duncit/datetime';

import { useAppSettingsStore } from '@/stores/app-settings.store';
import { appFormatter } from '@/utils/app-formatter';

/**
 * Admin-driven date/time formatter — the RN twin of mWeb's useDateFormat, built
 * from the same @duncit/datetime core so both surfaces render identically.
 *
 * Subscribes to the settings store, so a component re-renders once the admin's
 * formats land (the plain helpers in utils/date-format read the same store
 * without subscribing).
 */
export function useDateFormat(): DateFormatter {
  const data = useAppSettingsStore((s) => s.data);
  const fetch = useAppSettingsStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return appFormatter(data?.publicAppSettings);
}
