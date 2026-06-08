/**
 * Rough token-count estimate for a prompt. Mirrors OpenAI's rule of thumb
 * (~4 characters or ~0.75 words per token) by averaging the char- and word-based
 * estimates and rounding up, so we never under-budget. Deterministic and tiny —
 * no tokenizer dependency — and the AI portal replicates the SAME formula so the
 * live editor count matches what the server reports.
 */
export function estimateTokens(text: string): number {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 0;
  const chars = trimmed.length;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((chars / 4 + words / 0.75) / 2));
}
