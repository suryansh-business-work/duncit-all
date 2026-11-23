import { z } from 'zod';

/** Field builders shared by the Settings forms, so every bound reads the same message keys. */

export type Translate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

/** A whole number between `min` and `max`, coerced from the text input. */
export const intField = (t: Translate, min: number, max: number) =>
  z.coerce.number().int(t('intel.settings.common.integer')).min(min, t('intel.settings.common.min', { vars: { min } })).max(max, t('intel.settings.common.max', { vars: { max } }));

/** A decimal between `min` and `max`, coerced from the text input. */
export const numberField = (t: Translate, min: number, max: number) =>
  z.coerce.number().min(min, t('intel.settings.common.min', { vars: { min } })).max(max, t('intel.settings.common.max', { vars: { max } }));

/** Props for a numeric text input. */
export const NUMERIC = { type: 'number' as const, slotProps: { htmlInput: { inputMode: 'numeric' as const } } };
