import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import { useManualAssignees, useManualColumns, useManualSurfaces } from './useManualLookups';
import { CASE_TYPES, ENVIRONMENTS, ENVIRONMENT_KEYS, PRIORITIES, PRIORITY_KEYS, TYPE_KEYS } from './vocabulary';

export interface CaseOption {
  value: string;
  label: string;
}

/**
 * Every pick list a case is edited or filtered with, as value/label options —
 * the fixed vocabularies translated, the staff and surfaces as the server lists
 * them. One source for the board's filters, the table's filters and every case
 * form. Columns are separate ({@link useColumnOptions}): the board already reads
 * them with its cards and needs no second request.
 */
export function useCaseOptions() {
  const { t } = useTranslation();
  const { people } = useManualAssignees();
  const { surfaces } = useManualSurfaces();

  const fixed = useMemo(
    () => ({
      types: CASE_TYPES.map((value) => ({ value, label: t(TYPE_KEYS[value]) })),
      priorities: PRIORITIES.map((value) => ({ value, label: t(PRIORITY_KEYS[value]) })),
      environments: ENVIRONMENTS.map((value) => ({ value, label: t(ENVIRONMENT_KEYS[value]) })),
    }),
    [t]
  );
  const peopleOptions = useMemo(() => people.map((person) => ({ value: person.id, label: person.name })), [people]);
  const surfaceOptions = useMemo(
    () => surfaces.map((surface) => ({ value: surface.key, label: surface.name })),
    [surfaces]
  );

  return useMemo(
    () => ({ ...fixed, people: peopleOptions, surfaces: surfaceOptions }),
    [fixed, peopleOptions, surfaceOptions]
  );
}

/** The board's columns as status options, left to right. */
export function useColumnOptions(): CaseOption[] {
  const { columns } = useManualColumns();
  return useMemo(() => columns.map((column) => ({ value: column.id, label: column.name })), [columns]);
}
