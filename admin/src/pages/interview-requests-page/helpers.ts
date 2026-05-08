export const STATUS_COLORS: Record<
  string,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  PENDING: 'warning',
  SCHEDULED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
};

export const STATUS_KEYS = ['PENDING', 'SCHEDULED', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export const slotTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
