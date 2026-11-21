import { aiFeatureService, featureRangeDays } from '@modules/ai/aiFeature/aiFeature.service';
import { aiPromptService, type PublicAiPrompt } from './prompt.service';
import { CODE_PROMPTS } from './catalog';

/**
 * The AI Library dashboard: what the library holds, how far its code prompts
 * have drifted from the catalogue defaults, and how much the features each
 * prompt serves were used.
 *
 * Usage comes from the AI Features list (the OpenAI usage log grouped by
 * feature) joined through each prompt's `tasks`, so this page, the AI Features
 * table and the AI Features dashboard all read the same numbers.
 */

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The per-feature fields this dashboard reads from the AI Features list. */
export interface FeatureUsageRow {
  key: string;
  calls: number;
  failed_calls: number;
  total_tokens: number;
  cost_usd: number;
  prompts: readonly unknown[];
}

interface Count {
  key: string;
  code: number;
  ai: number;
}

/** Prompts per value of `pick`, split by kind; the biggest group first, then by name. */
function countBy(rows: readonly PublicAiPrompt[], pick: (row: PublicAiPrompt) => string): Count[] {
  const counts = new Map<string, Count>();
  for (const row of rows) {
    const key = pick(row);
    const count = counts.get(key) ?? { key, code: 0, ai: 0 };
    if (row.kind === 'CODE') count.code += 1;
    else count.ai += 1;
    counts.set(key, count);
  }
  return Array.from(counts.values()).sort(
    (a, b) => b.code + b.ai - (a.code + a.ai) || a.key.localeCompare(b.key),
  );
}

/** One prompt's row: its library facts plus the summed usage of the features it serves. */
function promptStat(row: PublicAiPrompt, usage: ReadonlyMap<string, FeatureUsageRow>) {
  const served = (row.tasks as string[]).flatMap((task) => {
    const feature = usage.get(task);
    return feature ? [feature] : [];
  });
  return {
    id: row.id,
    key: row.key,
    kind: row.kind,
    role: row.role,
    name: row.name,
    category: row.category,
    target_model: row.target_model,
    token_count: row.token_count,
    is_active: row.is_active,
    matches_default: row.matches_default,
    updated_at: row.updated_at,
    features: served.map((feature) => feature.key),
    calls: served.reduce((sum, f) => sum + f.calls, 0),
    failed_calls: served.reduce((sum, f) => sum + f.failed_calls, 0),
    total_tokens: served.reduce((sum, f) => sum + f.total_tokens, 0),
    cost_usd: round6(served.reduce((sum, f) => sum + f.cost_usd, 0)),
  };
}

/** The dashboard from the library rows and the feature usage. Pure, so it is unit-tested directly. */
export function summariseLibrary(
  rows: readonly PublicAiPrompt[],
  features: readonly FeatureUsageRow[],
  rangeDays: number,
  catalogueKeys: readonly string[] = CODE_PROMPTS.map((prompt) => prompt.key),
) {
  const code = rows.filter((row) => row.kind === 'CODE');
  const ai = rows.filter((row) => row.kind === 'AI');
  const inLibrary = new Set(code.map((row) => row.key));
  const usage = new Map(features.map((feature) => [feature.key, feature]));
  return {
    range_days: rangeDays,
    code_prompts: code.length,
    system_prompts: code.filter((row) => row.role === 'SYSTEM').length,
    user_prompts: code.filter((row) => row.role === 'USER').length,
    ai_prompts: ai.length,
    active_ai_prompts: ai.filter((row) => row.is_active).length,
    edited_code_prompts: code.filter((row) => row.matches_default === false).length,
    missing_code_prompts: catalogueKeys.filter((key) => !inLibrary.has(key)).length,
    features_total: features.length,
    features_with_prompt: features.filter((feature) => feature.prompts.length > 0).length,
    by_category: countBy(rows, (row) => row.category),
    by_model: countBy(rows, (row) => row.target_model),
    prompts: rows.map((row) => promptStat(row, usage)),
  };
}

export async function aiLibraryDashboard(rangeDays?: number | null) {
  const days = featureRangeDays(rangeDays);
  const [rows, features] = await Promise.all([aiPromptService.list({}), aiFeatureService.list(days)]);
  return summariseLibrary(rows, features, days);
}
