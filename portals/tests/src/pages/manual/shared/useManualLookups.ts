import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  MANUAL_TEST_ASSIGNEES,
  MANUAL_TEST_COLUMNS,
  MANUAL_TEST_SURFACES,
  type AssigneesData,
  type ColumnsData,
  type SurfacesData,
} from './lookup.queries';
import type { ManualColumn, ManualPerson, ManualSurface } from './types';

const EMPTY_COLUMNS: ManualColumn[] = [];
const EMPTY_PEOPLE: ManualPerson[] = [];
const EMPTY_SURFACES: ManualSurface[] = [];

/** The board's columns, left to right — cached and shared by every page. */
export function useManualColumns() {
  const { data, loading, error, refetch } = useQuery<ColumnsData>(MANUAL_TEST_COLUMNS, {
    fetchPolicy: 'cache-and-network',
  });
  return { columns: data?.manualTestColumns ?? EMPTY_COLUMNS, loading, error, refetch };
}

/** Tests staff a case can be assigned to or reported by. */
export function useManualAssignees() {
  const { data, loading, error } = useQuery<AssigneesData>(MANUAL_TEST_ASSIGNEES);
  return { people: data?.manualTestAssignees ?? EMPTY_PEOPLE, loading, error };
}

/** The consoles and apps a case can be about, with a name per key. */
export function useManualSurfaces() {
  const { data, loading, error } = useQuery<SurfacesData>(MANUAL_TEST_SURFACES);
  const surfaces = data?.manualTestSurfaces ?? EMPTY_SURFACES;
  const nameOf = useMemo(() => new Map(surfaces.map((surface) => [surface.key, surface.name])), [surfaces]);
  return { surfaces, nameOf, loading, error };
}
