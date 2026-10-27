import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { ManualTestBoardFilter } from '@duncit/gql-types';
import { CASE_TYPES, PRIORITIES } from '../shared/vocabulary';
import type { BoardFilterValues } from '../shared/types';

/** Each filter's query-string key: a filtered board is a link someone can paste. */
const PARAMS: Readonly<Record<keyof BoardFilterValues, string>> = {
  search: 'q',
  assignee: 'assignee',
  type: 'type',
  priority: 'priority',
  label: 'label',
  surface: 'surface',
};

const FIELDS: readonly (keyof BoardFilterValues)[] = ['search', 'assignee', 'type', 'priority', 'label', 'surface'];

/** The board's filters, held in the URL. */
export function useBoardFilters() {
  const [params, setParams] = useSearchParams();

  const values = useMemo<BoardFilterValues>(
    () => ({
      search: params.get(PARAMS.search) ?? '',
      assignee: params.get(PARAMS.assignee) ?? '',
      type: params.get(PARAMS.type) ?? '',
      priority: params.get(PARAMS.priority) ?? '',
      label: params.get(PARAMS.label) ?? '',
      surface: params.get(PARAMS.surface) ?? '',
    }),
    [params]
  );

  const setValue = useCallback(
    (field: keyof BoardFilterValues, value: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set(PARAMS[field], value);
          else next.delete(PARAMS[field]);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const clear = useCallback(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const field of FIELDS) next.delete(PARAMS[field]);
        return next;
      },
      { replace: true }
    );
  }, [setParams]);

  const active = FIELDS.some((field) => values[field] !== '');
  return { values, setValue, clear, active };
}

/** The URL's filters as the server's filter input; a value it does not know is ignored. */
export function toBoardFilter(values: BoardFilterValues): ManualTestBoardFilter {
  return {
    search: values.search.trim() || null,
    assignee_id: values.assignee || null,
    type: CASE_TYPES.find((type) => type === values.type) ?? null,
    priority: PRIORITIES.find((priority) => priority === values.priority) ?? null,
    label: values.label || null,
    surface: values.surface || null,
  };
}
