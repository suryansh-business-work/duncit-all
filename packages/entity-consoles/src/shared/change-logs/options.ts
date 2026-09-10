import type { EntityChangeActorType, EntityChangeLogRow } from './queries';

/**
 * How the enum columns of a change log read and filter.
 *
 * One list per enum, shared by the filter dropdown and the cell chip, so the
 * label an admin filters by is always the label they just read in the table.
 * The labels are localized, so each list is built from `t` rather than frozen
 * at module scope (rule 38).
 */

export interface ChangeLogOption {
  value: string;
  label: string;
}

type Translate = (key: string) => string;

export const actionOptions = (t: Translate): ChangeLogOption[] => [
  { value: 'CREATE', label: t('directory.changeLogs.actionCreate') },
  { value: 'UPDATE', label: t('directory.changeLogs.actionUpdate') },
  { value: 'DELETE', label: t('directory.changeLogs.actionDelete') },
];

export const actorOptions = (t: Translate): ChangeLogOption[] => [
  { value: 'OWNER', label: t('directory.changeLogs.actorOwner') },
  { value: 'ADMIN', label: t('directory.changeLogs.actorAdmin') },
  { value: 'SYSTEM', label: t('directory.changeLogs.actorSystem') },
];

export const sourceOptions = (t: Translate): ChangeLogOption[] => [
  { value: 'NATIVE', label: t('directory.changeLogs.sourceNative') },
  { value: 'MWEB', label: t('directory.changeLogs.sourceMweb') },
  { value: 'ADMIN_PORTAL', label: t('directory.changeLogs.sourceAdminPortal') },
  { value: 'PORTAL', label: t('directory.changeLogs.sourcePortal') },
  { value: 'SERVER', label: t('directory.changeLogs.sourceServer') },
];

/** The label for a stored enum value, falling back to the raw value. */
export const labelOf = (options: ChangeLogOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

export const ACTION_COLORS: Record<EntityChangeLogRow['action'], 'success' | 'info' | 'error'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
};

export const ACTOR_COLORS: Record<EntityChangeActorType, 'primary' | 'warning' | 'default'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  SYSTEM: 'default',
};
