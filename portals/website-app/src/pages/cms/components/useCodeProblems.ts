import { useCallback, useState } from 'react';

/**
 * Collects the syntax-error counts of a form's CodeFields, so the form can
 * refuse to save CSS or JavaScript that would break every page of the site.
 */
export function useCodeProblems() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const reporter = useCallback(
    (field: string) => (count: number) => setCounts((current) => (current[field] === count ? current : { ...current, [field]: count })),
    [],
  );
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { reporter, hasProblems: total > 0 };
}
