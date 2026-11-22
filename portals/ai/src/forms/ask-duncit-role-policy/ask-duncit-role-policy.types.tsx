import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * One role's policy in the AI Agent Control Center. Bounds mirror the server's
 * (askDuncitSettings.service rolePolicyInput). Tool-by-tool allow/block lives
 * on MCP & Tool Management; this form owns the role-wide levers.
 */
export const buildAskDuncitRolePolicySchema = (t: Translate) => {
  const int = (min: number, max: number) =>
    z.coerce.number().int(t('ai.askDuncit.validation.whole')).min(min, t('ai.askDuncit.validation.min', { vars: { min } })).max(max, t('ai.askDuncit.validation.max', { vars: { max } }));
  return z.object({
    enabled: z.boolean(),
    model: z.string().trim().max(80, t('ai.askDuncit.validation.modelMax')),
    max_output_tokens: int(100, 4000),
    allow_write: z.boolean(),
    approve_all_writes: z.boolean(),
    messages_per_minute: int(1, 120),
    messages_per_day: int(1, 10_000),
    tokens_per_day: int(1000, 50_000_000),
    allowed_categories: z.array(z.string()).max(60),
    instructions: z.string().max(4000, t('ai.askDuncit.validation.instructionsMax')),
  });
};

export type AskDuncitRolePolicyValues = z.infer<ReturnType<typeof buildAskDuncitRolePolicySchema>>;

export interface AskDuncitRolePolicyFormProps {
  initialValues: AskDuncitRolePolicyValues;
  categories: ReadonlyArray<{ key: string; label: string }>;
  disabled: boolean;
  submitting: boolean;
  onSubmit: (values: AskDuncitRolePolicyValues) => Promise<void>;
  onReset: () => void;
}
