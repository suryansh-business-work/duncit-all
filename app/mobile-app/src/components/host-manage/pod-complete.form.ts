import { z } from 'zod';

import { CategoryMediaType, type CompletePodInput } from '@/generated/graphql/graphql';

/** Shapes for the host's "Complete Pod" flow (venue bill + party media). */
export interface PodCompleteValues {
  venue_bill_amount: string;
  bill_url: string;
  media_text: string;
}

export interface HostPodForComplete {
  id: string;
  pod_title: string;
  venue_id?: string | null;
}

export const blankPodCompleteValues: PodCompleteValues = {
  venue_bill_amount: '',
  bill_url: '',
  media_text: '',
};

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

/** True when at least one party photo/video URL has been entered. */
export const hasMediaLine = (mediaText: string) => splitLines(mediaText).length > 0;

/** Schema depends on whether the pod has a venue: only then is a bill required. */
export const buildPodCompleteSchema = (hasVenue: boolean) =>
  z
    .object({
      venue_bill_amount: z.string().trim(),
      bill_url: z.string().trim(),
      media_text: z.string().refine(hasMediaLine, 'Add at least one party photo or video URL'),
    })
    .superRefine((values, ctx) => {
      if (!hasVenue) return;
      const amount = Number(values.venue_bill_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['venue_bill_amount'],
          message: 'Enter the venue bill amount',
        });
      }
      if (!values.bill_url.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bill_url'],
          message: 'Add the venue bill upload URL',
        });
      }
    });

/** Maps the validated values onto the server's CompletePodInput. */
export function buildCompleteInput(values: PodCompleteValues, podId: string): CompletePodInput {
  return {
    pod_id: podId,
    venue_bill_amount: Number(values.venue_bill_amount) || 0,
    bill_url: values.bill_url.trim() || undefined,
    evidence_media: splitLines(values.media_text).map((url) => ({
      url,
      type: VIDEO_URL_RE.test(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
  };
}
