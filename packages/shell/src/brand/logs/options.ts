import type { Translate } from '../../i18n/fallback';
import type { BrandChangeAction, BrandChangeActorType } from './queries';

/**
 * How the enum columns of the brand log read and filter. One list per enum,
 * shared by the filter dropdown and the cell chip, so the label someone filters
 * by is the label they just read. Built from `t`, never frozen at module scope.
 */
export interface BrandLogOption {
  value: string;
  label: string;
}

export const actionOptions = (t: Translate): BrandLogOption[] => [
  { value: 'CREATE', label: t('shell.brandConsole.actionCreate') },
  { value: 'UPDATE', label: t('shell.brandConsole.actionUpdate') },
  { value: 'DELETE', label: t('shell.brandConsole.actionDelete') },
];

export const actorOptions = (t: Translate): BrandLogOption[] => [
  { value: 'OWNER', label: t('shell.brandConsole.actorOwner') },
  { value: 'ADMIN', label: t('shell.brandConsole.actorAdmin') },
  { value: 'SYSTEM', label: t('shell.brandConsole.actorSystem') },
];

export const sourceOptions = (t: Translate): BrandLogOption[] => [
  { value: 'NATIVE', label: t('shell.brandConsole.sourceNative') },
  { value: 'MWEB', label: t('shell.brandConsole.sourceMweb') },
  { value: 'ADMIN_PORTAL', label: t('shell.brandConsole.sourceAdminPortal') },
  { value: 'PORTAL', label: t('shell.brandConsole.sourcePortal') },
  { value: 'SERVER', label: t('shell.brandConsole.sourceServer') },
];

/** The label for a stored enum value, or the raw value when the server sends a new one. */
export const labelOf = (options: BrandLogOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

export const ACTION_COLORS: Record<BrandChangeAction, 'success' | 'info' | 'error'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
};

export const ACTOR_COLORS: Record<BrandChangeActorType, 'primary' | 'warning' | 'default'> = {
  OWNER: 'primary',
  ADMIN: 'warning',
  SYSTEM: 'default',
};
