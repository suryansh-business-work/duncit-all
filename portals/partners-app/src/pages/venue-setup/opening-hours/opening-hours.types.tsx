import { z } from 'zod';
import { TIME_OF_DAY_PATTERN } from '@duncit/forms';
import type { Translate } from '@duncit/shell';

/** What the opening-hours form holds: one daily window and the weekly off days (0 = Sunday). */
export interface OpeningHoursValues {
  open: string;
  close: string;
  weekly_off_days: number[];
}

/** The venue's stored settings, as the venue list reads them. */
export interface OpeningHoursSource {
  operating_hours?: { open: string; close: string } | null;
  weekly_off_days?: number[] | null;
}

/** The server's own default window when a venue has none saved. */
const DEFAULT_OPEN = '09:00';
const DEFAULT_CLOSE = '23:00';

export const openingHoursValues = (settings: OpeningHoursSource | null | undefined): OpeningHoursValues => ({
  open: settings?.operating_hours?.open || DEFAULT_OPEN,
  close: settings?.operating_hours?.close || DEFAULT_CLOSE,
  weekly_off_days: [...(settings?.weekly_off_days ?? [])].sort((a, b) => a - b),
});

/** What `updateVenueSettings` takes for this form — only its own two fields. */
export const toOpeningHoursInput = (values: OpeningHoursValues) => ({
  operating_hours: { open: values.open, close: values.close },
  weekly_off_days: [...values.weekly_off_days].sort((a, b) => a - b),
});

export const buildOpeningHoursSchema = (t: Translate) =>
  z
    .object({
      open: z.string().regex(TIME_OF_DAY_PATTERN, t('partners.venueSetup.timeRequired')),
      close: z.string().regex(TIME_OF_DAY_PATTERN, t('partners.venueSetup.timeRequired')),
      weekly_off_days: z.array(z.number().int().min(0).max(6)),
    })
    .refine((values) => values.close > values.open, {
      message: t('partners.venueSetup.closeAfterOpen'),
      path: ['close'],
    });
