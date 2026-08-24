/**
 * The two enums the queue filters on.
 *
 * They are server values, not copy — the chip shows the status itself, the way
 * the rest of the Tech portal shows a container state or an environment name.
 * Reading them from one place keeps the filter options and the chip colours
 * from drifting apart.
 */
export const DELETION_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'REJECTED'] as const;
export const DELETION_SURFACES = ['MWEB', 'APP', 'UNKNOWN'] as const;

type ChipColor = 'default' | 'warning' | 'success' | 'info' | 'error';

export const STATUS_COLOR: Record<string, ChipColor> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'info',
  REJECTED: 'error',
};

const toOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

export const statusOptions = () => toOptions(DELETION_STATUSES);
export const surfaceOptions = () => toOptions(DELETION_SURFACES);
