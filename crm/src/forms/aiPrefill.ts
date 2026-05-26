/**
 * Merge AI-parsed JSON over an initial form values object. Only copies
 * keys that exist on the target and are not undefined/null in the source,
 * so the model can't accidentally introduce stray fields. Arrays and
 * primitives are replaced wholesale.
 */
export function mergeAiPrefill<T>(initial: T, prefill?: Partial<T> | null): T {
  if (!prefill) return initial;
  const out: Record<string, unknown> = { ...(initial as Record<string, unknown>) };
  const source = prefill as Record<string, unknown>;
  for (const key of Object.keys(initial as Record<string, unknown>)) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out as T;
}
