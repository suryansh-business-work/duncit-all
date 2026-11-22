import { z } from 'zod';
import { MAX_HOST_ENGAGEMENT_LABEL_LENGTH, MAX_HOST_ENGAGEMENT_STATUSES } from '@duncit/utils';
import type { useTranslation } from '@duncit/shell';
import type { HostEngagementStatusesValues } from './host-engagement-statuses.types';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The same rules the server enforces on `host_engagement_statuses`: a label on
 * every row (at most 40 characters), at most 20 rows, at least one offered.
 * Keys are never edited here — the server derives one for a new row.
 */
export const buildStatusesSchema = (t: Translate) =>
  z.object({
    statuses: z
      .array(
        z.object({
          key: z.string(),
          label: z
            .string()
            .trim()
            .min(1, t('admin.podSettings.hostEngagement.statusesInvalid'))
            .max(MAX_HOST_ENGAGEMENT_LABEL_LENGTH, t('admin.podSettings.hostEngagement.statusesInvalid')),
          is_active: z.boolean(),
        })
      )
      .max(MAX_HOST_ENGAGEMENT_STATUSES, t('admin.podSettings.hostEngagement.statusesTooMany'))
      .refine((rows) => rows.some((row) => row.is_active), t('admin.podSettings.hostEngagement.statusesInvalid')),
  });

/** The mutation's input: saved rows keep their key, new rows go without one. */
export function toStatusesInput(values: HostEngagementStatusesValues) {
  return {
    host_engagement_statuses: values.statuses.map((row) => ({
      ...(row.key ? { key: row.key } : {}),
      label: row.label.trim(),
      is_active: row.is_active,
    })),
  };
}
