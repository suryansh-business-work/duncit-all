import { formatDate as adminDate } from '@duncit/app-settings';
import type { useTranslation } from '@duncit/shell';

export type TranslateFn = ReturnType<typeof useTranslation>['t'];

export const joinList = (values?: string[] | null) => (values?.length ? values.join(', ') : '—');

export const leadDate = (iso?: string | null) => adminDate(iso) || null;
