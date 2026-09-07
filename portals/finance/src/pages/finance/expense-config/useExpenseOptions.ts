import { useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { EXPENSE_OPTIONS, type ExpenseOption, type ExpenseOptionKind } from './queries';

export interface ExpenseOptionsResult {
  options: ExpenseOption[];
  loading: boolean;
  /**
   * A stored key back to its display name.
   *
   * An unknown key renders as ITSELF rather than blank. Only the active list is
   * loaded here, so an expense filed under an option Finance later switched off
   * falls through — and a legible `EVENT_MATERIAL` beats an empty cell that
   * reads as missing data.
   */
  labelOf: (key: string) => string;
}

/**
 * One configured dropdown, read from the server.
 *
 * Cache-first on purpose: these four lists change when somebody edits Settings,
 * not while an expense is being typed, and every field on the form would
 * otherwise re-ask on each mount.
 */
export function useExpenseOptions(kind: ExpenseOptionKind): ExpenseOptionsResult {
  const { data, loading } = useQuery<{ expenseOptions: ExpenseOption[] }>(EXPENSE_OPTIONS, {
    variables: { kind },
    fetchPolicy: 'cache-first',
  });
  const options = useMemo(() => data?.expenseOptions ?? [], [data]);
  const labels = useMemo(
    () => Object.fromEntries(options.map((option) => [option.key, option.label])),
    [options],
  );
  const labelOf = useCallback((key: string) => labels[key] ?? key, [labels]);
  return { options, loading, labelOf };
}
