import { z } from 'zod';
import type { HostPodActionLabels } from '../labels';

/** Mirrors the server's POD_DELETE_REASON_SUBJECTS list. */
export const POD_DELETE_REASON_SUBJECTS = [
  'Event cancelled',
  'Venue unavailable',
  'Low attendance',
  'Rescheduling',
  'Other',
] as const;

export interface PodCancelValues {
  reason_subject: string;
  reason_note: string;
}

export const blankPodCancelValues: PodCancelValues = { reason_subject: '', reason_note: '' };

/** Built from the surface's labels: a validation message is copy the host
 *  reads, so it follows their language like the rest of the dialog (rule 38). */
export const buildPodCancelSchema = (labels: HostPodActionLabels) =>
  z
    .object({
      reason_subject: z.string().min(1, labels.reasonRequired),
      reason_note: z.string().trim().max(500, labels.noteTooLong),
    })
    .superRefine((values, ctx) => {
      if (values.reason_subject === 'Other' && !values.reason_note.trim()) {
        ctx.addIssue({ code: 'custom', path: ['reason_note'], message: labels.noteRequired });
      }
    });
