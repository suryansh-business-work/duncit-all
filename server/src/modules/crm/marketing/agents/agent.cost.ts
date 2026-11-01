import { OpenAiModelPriceModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import type { OpenAiUsage } from '@services/openai/openai.client';
import type { RunContext } from '../runs/marketingRun.service';

/**
 * What the plan cost, written onto the run. The tokens come back on the AI
 * funnel's answer; the money is read off the AI portal's rate card (USD per
 * million tokens, the same card every usage row is priced with). A model with
 * no rate records its tokens and an amount of zero, never a guess.
 */
export const PLAN_COST_CURRENCY = 'USD';
const PER_MILLION = 1e6;

const round6 = (n: number) => Math.round(n * PER_MILLION) / PER_MILLION;

export async function recordPlanCost(run: RunContext, model: string, usage: OpenAiUsage | undefined): Promise<void> {
  if (!usage) return;
  const rate = await OpenAiModelPriceModel.findOne({ model }).lean();
  const amount = rate
    ? round6((usage.prompt_tokens / PER_MILLION) * rate.input_per_1m + (usage.completion_tokens / PER_MILLION) * rate.output_per_1m)
    : 0;
  await run.cost({ tokens_in: usage.prompt_tokens, tokens_out: usage.completion_tokens, amount, currency: PLAN_COST_CURRENCY });
}
