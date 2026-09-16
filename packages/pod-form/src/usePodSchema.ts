import { useMemo } from 'react';
import { makePodSchema } from './schema';
import { useTicketDiscountMaxPct } from './useTicketDiscountMaxPct';
import type { Translate } from './i18n/useTranslation';
import type { PodFormConfig } from './types';

/**
 * The form's Zod schema, with the admin's multi-ticket discount ceiling baked in.
 *
 * Rebuilt when the language changes: a Zod message is baked in at schema build
 * time, so a schema memoised on `config` alone would keep showing the language
 * that was active when the form first mounted. Rebuilt too when the ceiling
 * arrives, so the tiers are never judged against the loading default.
 */
export function usePodSchema(config: PodFormConfig, t: Translate) {
  const ticketDiscountMaxPct = useTicketDiscountMaxPct();
  return useMemo(
    () => makePodSchema(config, t, ticketDiscountMaxPct),
    [config, t, ticketDiscountMaxPct],
  );
}
