/**
 * Live token-count estimate for the prompt editor. Uses the EXACT same formula
 * as the server (`@services/ai/token-estimate`) so the count shown while typing
 * matches what the Prompt Library stores/reports. ~4 chars or ~0.75 words per
 * token (OpenAI's rule of thumb), averaged and rounded up.
 */
export function estimateTokens(text: string): number {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 0;
  const chars = trimmed.length;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((chars / 4 + words / 0.75) / 2));
}
