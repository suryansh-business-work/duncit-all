import { z } from 'zod';
import type { StressSettings } from '../queries';

export interface StressSettingsMessages {
  whole: string;
  range: (min: number, max: number) => string;
}

const wholeIn = (m: StressSettingsMessages, min: number, max: number) =>
  z.coerce.number({ message: m.whole }).int(m.whole).min(min, m.range(min, max)).max(max, m.range(min, max));

/** The same bounds the server enforces in stressTestService.updateSettings. */
export const stressSettingsSchema = (m: StressSettingsMessages) =>
  z.object({
    max_virtual_users: wholeIn(m, 1, 20_000),
    max_browser_bots: wholeIn(m, 0, 50),
    max_runners: wholeIn(m, 1, 20),
    max_duration_minutes: wholeIn(m, 1, 120),
    abort_error_rate_pct: wholeIn(m, 1, 100),
    abort_p95_ms: wholeIn(m, 100, 120_000),
    abort_host_cpu_pct: wholeIn(m, 10, 100),
    abort_breach_samples: wholeIn(m, 1, 60),
    sample_retention_days: wholeIn(m, 1, 365),
  });

export type StressSettingsValues = z.infer<ReturnType<typeof stressSettingsSchema>>;

export function toSettingsForm(settings: StressSettings): StressSettingsValues {
  const { updated_at: _updatedAt, ...values } = settings;
  return values;
}
