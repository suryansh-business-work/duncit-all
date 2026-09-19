/**
 * Which keys an AI translation run sends — the one definition the job, the
 * "how many will be sent" count and the coverage column all read, so the
 * three can never disagree about what "out of date" means.
 *
 * - MISSING  — the language has no text for the key yet.
 * - OUTDATED — missing, or its text was written against default-language copy
 *              that has changed since (`synced_from` no longer matches). This
 *              is "sync with English".
 * - ALL      — every key, replacing what is there, hand-written text included.
 *
 * Only keys that carry default-language text are ever sent: there is nothing
 * to translate FROM otherwise.
 */
export const AI_TRANSLATE_SCOPES = ['MISSING', 'OUTDATED', 'ALL'] as const;
export type AiTranslateScope = (typeof AI_TRANSLATE_SCOPES)[number];

/** Narrow a run to one namespace — the surface + page pair its keys share. */
export interface TranslateNamespace {
  surface?: string | null;
  page?: string | null;
}

const hasText = { $nin: ['', null] };
const noText = { $in: [null, ''] };

/** `map.<code>` as an aggregation expression. Missing map or entry reads as missing. */
const mapEntry = (map: string, code: string) => ({
  $getField: { field: code, input: { $ifNull: [`$${map}`, {}] } },
});

/**
 * True when the key's text in `target` was written against default-language
 * copy that has since changed. Text with no record at all (written before
 * records were kept, and not yet baselined) counts as in sync — re-sending it
 * would overwrite work nobody asked to redo.
 */
export function outdatedExpr(source: string, target: string) {
  const recorded = mapEntry('synced_from', target);
  return {
    $and: [
      { $ne: [{ $type: recorded }, 'missing'] },
      { $ne: [recorded, mapEntry('values', source)] },
    ],
  };
}

/** Keys carrying default-language text, narrowed to the namespace. */
function baseFilter(source: string, namespace: TranslateNamespace): Record<string, unknown> {
  const filter: Record<string, unknown> = { [`values.${source}`]: hasText };
  const surface = namespace.surface?.trim();
  const page = namespace.page?.trim();
  if (surface) filter.surface = surface;
  if (page) filter.page = page;
  return filter;
}

/** The keys a run with this scope sends for `target`. */
export function pendingFilter(
  source: string,
  target: string,
  scope: AiTranslateScope,
  namespace: TranslateNamespace = {},
): Record<string, unknown> {
  const filter = baseFilter(source, namespace);
  const missing = { [`values.${target}`]: noText };
  if (scope === 'MISSING') return { ...filter, ...missing };
  if (scope === 'OUTDATED') {
    return { ...filter, $or: [missing, { $expr: outdatedExpr(source, target) }] };
  }
  return filter;
}

/** Keys whose `target` text exists but is out of date — the coverage column's second number. */
export function outdatedFilter(source: string, target: string): Record<string, unknown> {
  return {
    ...baseFilter(source, {}),
    [`values.${target}`]: hasText,
    $expr: outdatedExpr(source, target),
  };
}
