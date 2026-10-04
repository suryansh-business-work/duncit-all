import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The server's bounds for the notice window (catalogDeletion.model DELETION_WINDOW_BOUNDS). */
export const WINDOW_BOUNDS = { min: 1, max: 365 } as const;

export interface CatalogDeletionWindow {
  min_days: number;
  max_days: number;
  earliest: string;
  latest: string;
  updated_at: string;
}

/** Whole days inside the bounds, held as strings so an emptied field stays empty. */
const days = (t: Translate) =>
  z
    .string()
    .trim()
    .refine((value) => {
      const n = Number(value);
      return value !== '' && Number.isInteger(n) && n >= WINDOW_BOUNDS.min && n <= WINDOW_BOUNDS.max;
    }, t('products.deletionSettings.range', { vars: { min: WINDOW_BOUNDS.min, max: WINDOW_BOUNDS.max } }));

export const deletionSettingsSchema = (t: Translate) =>
  z
    .object({ min_days: days(t), max_days: days(t) })
    .refine((v) => Number(v.min_days) <= Number(v.max_days), {
      path: ['max_days'],
      message: t('products.deletionSettings.minAboveMax'),
    });

export type DeletionSettingsFormValues = z.infer<ReturnType<typeof deletionSettingsSchema>>;

export const toDeletionSettingsForm = (w: CatalogDeletionWindow): DeletionSettingsFormValues => ({
  min_days: String(w.min_days),
  max_days: String(w.max_days),
});

export const toDeletionSettingsInput = (v: DeletionSettingsFormValues) => ({
  min_days: Number(v.min_days),
  max_days: Number(v.max_days),
});
