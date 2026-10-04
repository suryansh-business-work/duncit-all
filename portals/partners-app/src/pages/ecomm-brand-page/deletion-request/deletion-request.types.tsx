import { z } from 'zod';
import type { CatalogDeletionKind, CatalogDeletionMode, MutationRequestCatalogDeletionArgs } from '@duncit/gql-types';
import type { Translate } from '../brand-wizard/wizard-steps';
import type { DeletionPreview } from './deletion.queries';

/** The longest reason the server keeps. */
export const DELETION_REASON_MAX = 1000;

/** What happens to running orders — the two choices the partner picks between. */
export const DELETION_MODES = ['WAIT_FOR_ORDERS', 'CANCEL_AND_REFUND'] as const satisfies readonly CatalogDeletionMode[];

export interface DeletionRequestValues {
  mode: CatalogDeletionMode;
  /** yyyy-MM-dd inside the preview's window. */
  scheduled_for: string;
  reason: string;
}

/** The item a deletion request is raised for. */
export interface DeletionTarget {
  kind: CatalogDeletionKind;
  id: string;
  name: string;
}

/** The date must fall in the window the server allows (yyyy-MM-dd strings compare in date order). */
export const makeDeletionRequestSchema = (t: Translate, earliest: string, latest: string) =>
  z.object({
    mode: z.enum(DELETION_MODES),
    scheduled_for: z
      .string()
      .min(1, t('partners.deletionRequest.dateRequired'))
      .refine((day) => day >= earliest && day <= latest, t('partners.deletionRequest.dateOutOfWindow')),
    reason: z.string().trim().max(DELETION_REASON_MAX, t('partners.deletionRequest.reasonTooLong')),
  });

/** The form opens on the gentler choice and the first day allowed. */
export const deletionDefaults = (preview: DeletionPreview): DeletionRequestValues => ({
  mode: 'WAIT_FOR_ORDERS',
  scheduled_for: preview.window.earliest,
  reason: '',
});

export const toDeletionRequestVariables = (
  target: DeletionTarget,
  values: DeletionRequestValues,
): MutationRequestCatalogDeletionArgs => ({
  input: {
    kind: target.kind,
    target_id: target.id,
    mode: values.mode,
    scheduled_for: values.scheduled_for,
    reason: values.reason.trim() || null,
  },
});
