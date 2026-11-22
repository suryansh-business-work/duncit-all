import { z } from 'zod';
import { ASK_DUNCIT_HANDOVER_SUMMARY_MAX, isAskDuncitHandoverTeam } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * Handing an Ask Duncit conversation to a human team — mWeb's dialog and the
 * native sheet ask the same two things: which team, and (optionally) what the
 * person needs. The limit is the server's own (rules 27 + 40); every refusal
 * is an `askDuncit.handover.*` key both apps ship (rule 38).
 */
export function makeAskDuncitHandoverSchema(t: Translate) {
  return z.object({
    team: z.string().refine((value): boolean => isAskDuncitHandoverTeam(value), t('askDuncit.handover.teamRequired')),
    summary: z
      .string()
      .trim()
      .max(
        ASK_DUNCIT_HANDOVER_SUMMARY_MAX,
        t('askDuncit.handover.summaryTooLong', { vars: { max: String(ASK_DUNCIT_HANDOVER_SUMMARY_MAX) } }),
      ),
  });
}

export type AskDuncitHandoverValues = z.infer<ReturnType<typeof makeAskDuncitHandoverSchema>>;

/** Support is the usual destination; the person can pick another team. */
export const askDuncitHandoverDefaults: AskDuncitHandoverValues = { team: 'SUPPORT', summary: '' };
