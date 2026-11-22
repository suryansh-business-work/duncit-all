import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';
import type { HostEngagementStatusOption } from '../queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The server's note limit on setClubHostEngagement. */
export const ENGAGEMENT_NOTE_MAX = 1000;

/** A status is required and the note stays within the server's limit. */
export const buildEngagementSchema = (t: Translate) =>
  z.object({
    status_key: z.string().min(1, t('clubAdmin.hosts.statusRequired')),
    note: z.string().trim().max(ENGAGEMENT_NOTE_MAX, t('clubAdmin.hosts.noteTooLong')),
  });

/**
 * What the status select offers: every ACTIVE status, plus the host's current
 * one when an admin has since switched it off — so the select still shows what
 * they are filed under, marked as no longer offered, without offering it to
 * anyone else.
 */
export function engagementOptions(statuses: readonly HostEngagementStatusOption[], currentKey: string) {
  return statuses.filter((status) => status.is_active || status.key === currentKey);
}
