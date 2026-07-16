import type { StatusColorMap } from '@duncit/ui';

/**
 * Status → MUI Chip color vocabularies shared by each list table and its
 * detail page (previously duplicated per file). Passed to @duncit/ui's
 * <StatusChip colorMap> so the rendered colors stay exactly as authored.
 */
export const TICKET_STATUS_COLORS: StatusColorMap = {
  OPEN: 'primary',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

export const TICKET_PRIORITY_COLORS: StatusColorMap = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'default',
};

export const SOS_STATUS_COLORS: StatusColorMap = {
  ACTIVE: 'error',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
};

export const CALLBACK_STATUS_COLORS: StatusColorMap = {
  PENDING: 'warning',
  CONTACTED: 'primary',
  CLOSED: 'default',
};
