import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Pulling the emergency stop needs a reason — it is shown in the audit trail
 * as the KILL_SWITCH row and is what the next operator reads.
 */
export const buildAskDuncitKillSwitchSchema = (t: Translate) =>
  z.object({
    reason: z.string().trim().min(3, t('ai.askDuncit.validation.reasonRequired')).max(300, t('ai.askDuncit.validation.reasonMax')),
  });

export type AskDuncitKillSwitchValues = z.infer<ReturnType<typeof buildAskDuncitKillSwitchSchema>>;

export const askDuncitKillSwitchDefaults: AskDuncitKillSwitchValues = { reason: '' };

export interface AskDuncitKillSwitchFormProps {
  formId: string;
  onSubmit: (values: AskDuncitKillSwitchValues) => Promise<void>;
}
