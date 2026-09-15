import { z } from 'zod';
import type { MonitorSettings } from '../../queries';

export interface GraphqlMonitorSettingsMessages {
  whole: string;
  range: (min: number, max: number) => string;
}

const wholeIn = (m: GraphqlMonitorSettingsMessages, min: number, max: number) =>
  z.coerce.number({ message: m.whole }).int(m.whole).min(min, m.range(min, max)).max(max, m.range(min, max));

/** The same bounds the server enforces in graphqlMonitor.settings. */
export const graphqlMonitorSettingsSchema = (m: GraphqlMonitorSettingsMessages) =>
  z.object({
    enabled: z.boolean(),
    field_sample_pct: wholeIn(m, 0, 100),
    retention_days: wholeIn(m, 1, 90),
    slow_threshold_ms: wholeIn(m, 50, 120_000),
  });

export type GraphqlMonitorSettingsValues = z.infer<ReturnType<typeof graphqlMonitorSettingsSchema>>;

export function toSettingsForm(settings: MonitorSettings): GraphqlMonitorSettingsValues {
  const { updated_at: _updatedAt, ...values } = settings;
  return values;
}
